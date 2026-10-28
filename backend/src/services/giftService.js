const crypto = require("crypto");
const Stripe = require("stripe");
const { query } = require("../config/db");
const env = require("../config/env");
const chatService = require("./chatService");
const pushService = require("./pushService");
const { encryptAddress, decryptAddress } = require("./giftCrypto");
const { computeGiftOrderTotal, productRules } = require("./giftPricing");

let stripe = env.stripe.secretKey ? new Stripe(env.stripe.secretKey) : null;

// Every legal status change. Anything not listed here is rejected, so a replayed
// webhook, a double tap or a wrong ops call can never move an order backwards.
const TRANSITIONS = {
  recipient_pending: ["recipient_accepted", "cancelled", "expired"],
  recipient_accepted: ["merchant_preparing", "cancelled", "expired"],
  payment_authorized: ["merchant_preparing", "cancelled", "failed"],
  merchant_preparing: ["courier_assigned", "picked_up", "delivered", "cancelled", "failed"],
  courier_assigned: ["picked_up", "delivered", "cancelled", "failed"],
  picked_up: ["delivered", "failed"],
  cancelled: ["refunded"],
  failed: ["refunded"],
  delivered: [],
  refunded: [],
  expired: [],
};
const TERMINAL = ["delivered", "cancelled", "failed", "refunded", "expired"];
const OPS_TARGETS = ["courier_assigned", "picked_up", "delivered", "failed", "cancelled"];

// Columns a transition may change besides `status`. `true` on a *_at column means NOW(6).
const SETTABLE = new Set([
  "paid_at",
  "delivered_at",
  "cancelled_reason",
  "refund_id",
  "provider",
  "provider_order_id",
  "tracking_url",
  "stripe_payment_intent_id",
  "delivery_address",
]);

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function getRawOrder(orderId) {
  const rows = await query("SELECT * FROM gift_orders WHERE id = ?", [orderId]);
  return rows[0] || null;
}

async function getOrderOr404(orderId, userId) {
  const order = await getRawOrder(orderId);
  if (!order) throw httpError(404, "Gift order not found");
  if (order.sender_id !== userId && order.recipient_id !== userId) {
    throw httpError(403, "You do not have access to this gift order.");
  }
  return order;
}

function readAddress(order) {
  if (!order.delivery_address) return null;
  try {
    return decryptAddress(order.delivery_address);
  } catch (error) {
    console.error(`[gifts] could not read address for order ${order.id}: ${error.message}`);
    return null;
  }
}

function toClientOrder(order, viewerId) {
  const isSender = order.sender_id === viewerId;
  return {
    orderId: order.id,
    status: order.status,
    productId: order.product_id,
    productName: order.product_name,
    note: order.note,
    currency: order.currency,
    totalCents: order.total_cents,
    trackingUrl: order.tracking_url || undefined,
    paidAt: order.paid_at || undefined,
    deliveredAt: order.delivered_at || undefined,
    cancelledReason: order.cancelled_reason || undefined,
    // The sender never sees the recipient's address.
    deliveryAddress: isSender ? undefined : readAddress(order) || undefined,
  };
}

async function addEvent(orderId, status, actor, detail) {
  await query(
    "INSERT INTO gift_order_events (order_id, status, actor, detail) VALUES (?, ?, ?, ?)",
    [orderId, status, actor, detail ? JSON.stringify(detail) : null],
  );
}

const MESSAGES = {
  recipient_accepted: {
    sender: ["Gift accepted 🎉", "They accepted your gift. Complete the payment to send it."],
  },
  merchant_preparing: {
    sender: ["Payment confirmed", "Your gift order is being prepared."],
    recipient: ["Your gift is on the way! 🎁", "A gift for you has been paid for and is being prepared."],
  },
  courier_assigned: {
    sender: ["Courier assigned", "A courier has been assigned to your gift."],
    recipient: ["Your gift is getting ready", "A courier has been assigned to your gift."],
  },
  picked_up: {
    sender: ["Your gift is on its way", "The courier has picked up your gift."],
    recipient: ["Your gift is on its way! 🎁", "The courier has picked up your gift."],
  },
  delivered: {
    sender: ["Gift delivered 🎁", "Your gift has been delivered."],
    recipient: ["Gift delivered 🎁", "Your gift has arrived. Enjoy!"],
  },
  cancelled: {
    sender: ["Gift cancelled", "The gift order was cancelled. Any payment is refunded automatically."],
    recipient: ["Gift cancelled", "The gift order was cancelled."],
  },
  failed: {
    sender: ["Delivery failed", "We could not deliver your gift. Your payment is being refunded."],
    recipient: ["Delivery failed", "We could not deliver your gift."],
  },
  refunded: {
    sender: ["Refund issued", "Your gift payment has been refunded."],
  },
  expired: {
    sender: ["Gift expired", "The gift was not completed in time and has expired."],
    recipient: ["Gift expired", "A gift request has expired."],
  },
};

async function notifyStatus(order, status, actorUserId) {
  const copy = MESSAGES[status];
  if (!copy) return;
  const data = { type: "gift_order", status, orderId: order.id, conversationId: order.conversation_id };
  const sends = [];
  if (copy.sender && order.sender_id !== actorUserId) {
    sends.push(pushService.notifyUser(order.sender_id, { title: copy.sender[0], body: copy.sender[1], data }));
  }
  if (copy.recipient && order.recipient_id !== actorUserId) {
    sends.push(pushService.notifyUser(order.recipient_id, { title: copy.recipient[0], body: copy.recipient[1], data }));
  }
  await Promise.all(sends);
}

async function notifyGiftOrderCreated(order) {
  const isReady = order.status === "recipient_accepted";
  await pushService.notifyUser(order.recipient_id, {
    title: "You received a gift! 🎁",
    body: isReady
      ? `Someone sent you a gift: ${order.product_name}`
      : `Someone wants to send you a gift: ${order.product_name}. Tap to respond.`,
    data: { type: "gift_order", orderId: order.id, conversationId: order.conversation_id },
  });
}

/**
 * The only place that changes an order's status. The UPDATE is guarded by the
 * current status, so two racing callers (webhook + client confirm) cannot both win.
 * Returns { changed, order }.
 */
async function transition(orderId, to, options = {}) {
  const { actor = "system", actorUserId = null, detail = null, set = {} } = options;
  const from = Object.keys(TRANSITIONS).filter((s) => TRANSITIONS[s].includes(to));
  if (!from.length) throw new Error(`Unknown target status: ${to}`);

  const assignments = ["status = ?"];
  const params = [to];
  for (const [column, value] of Object.entries(set)) {
    if (!SETTABLE.has(column)) throw new Error(`Column not settable: ${column}`);
    if (value === true && column.endsWith("_at")) {
      assignments.push(`${column} = NOW(6)`);
    } else {
      assignments.push(`${column} = ?`);
      params.push(value === undefined ? null : value);
    }
  }
  params.push(orderId, ...from);
  const result = await query(
    `UPDATE gift_orders SET ${assignments.join(", ")} WHERE id = ? AND status IN (${from.map(() => "?").join(",")})`,
    params,
  );
  const order = await getRawOrder(orderId);
  if (!result.affectedRows) return { changed: false, order };

  await addEvent(orderId, to, actor, detail);
  notifyStatus(order, to, actorUserId).catch(() => undefined);
  if ((to === "cancelled" || to === "failed") && order.paid_at) {
    // Money was taken, so give it back automatically.
    await refundOrder(order, actor);
    return { changed: true, order: await getRawOrder(orderId) };
  }
  return { changed: true, order };
}

async function refundOrder(order, actor = "system") {
  if (!stripe || !order.stripe_payment_intent_id || order.refund_id) return null;
  try {
    const refund = await stripe.refunds.create(
      { payment_intent: order.stripe_payment_intent_id, metadata: { orderId: order.id } },
      { idempotencyKey: `gift-refund-${order.id}` },
    );
    await transition(order.id, "refunded", {
      actor,
      detail: { refundId: refund.id },
      set: { refund_id: refund.id },
    });
    return refund;
  } catch (error) {
    // Stay in cancelled/failed and leave a trail so ops can retry by hand.
    console.error(`[gifts] refund failed for order ${order.id}: ${error.message}`);
    await addEvent(order.id, "refund_failed", actor, { message: error.message });
    return null;
  }
}

async function markPaid(orderId, paymentIntentId, actor) {
  const intent = paymentIntentId ? String(paymentIntentId) : null;
  const result = await transition(orderId, "merchant_preparing", {
    actor,
    detail: { paymentIntent: intent },
    set: { paid_at: true, stripe_payment_intent_id: intent },
  });
  const order = result.order;
  if (!result.changed && order && !order.paid_at && ["cancelled", "expired", "failed"].includes(order.status) && stripe && intent) {
    // Customer paid after the gift was already cancelled or expired: return the money.
    const refund = await stripe.refunds.create(
      { payment_intent: intent, metadata: { orderId } },
      { idempotencyKey: `gift-late-refund-${orderId}` },
    );
    await query("UPDATE gift_orders SET refund_id = ?, stripe_payment_intent_id = ? WHERE id = ?", [refund.id, intent, orderId]);
    await addEvent(orderId, "refunded", actor, { lateRefund: true, refundId: refund.id });
  }
  return result;
}

async function createOrder(conversationId, senderId, input) {
  const participants = await chatService.assertParticipant(conversationId, senderId);
  const recipientId = participants.find((id) => id !== senderId);
  if (!recipientId) throw httpError(400, "Could not determine the recipient.");
  if (!productRules[input.productId]) throw httpError(400, "Unknown gift product.");
  // SECURITY: totalCents is always computed server-side from the catalog. The client's
  // totalCents (if any) is ignored entirely so a tampered request cannot change the charge.
  const priced = computeGiftOrderTotal({
    productId: input.productId,
    currency: input.currency,
    deliveryWindow: input.deliveryWindow,
    tipCents: input.tipCents,
    marketCountry: input.marketCountry,
  });
  const id = crypto.randomUUID();
  const address = input.deliveryAddress;
  const hasAddress = !!(address && address.line1 && address.city);
  const status = hasAddress ? "recipient_accepted" : "recipient_pending";
  await query(
    `INSERT INTO gift_orders (id, conversation_id, sender_id, recipient_id, product_id, product_name, note, currency, total_cents, status, delivery_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      conversationId,
      senderId,
      recipientId,
      String(input.productId),
      priced.productName,
      input.note ? String(input.note).slice(0, 500) : null,
      priced.currency,
      priced.totalCents,
      status,
      hasAddress ? encryptAddress(address) : null,
    ],
  );
  await addEvent(id, status, "sender", null);
  const order = await getOrderOr404(id, senderId);
  notifyGiftOrderCreated(order).catch(() => undefined);
  return toClientOrder(order, senderId);
}

async function respondToOrder(orderId, userId, accept, deliveryAddress) {
  const order = await getOrderOr404(orderId, userId);
  if (order.recipient_id !== userId) throw httpError(403, "Only the recipient can respond to this gift.");
  if (order.status !== "recipient_pending") return toClientOrder(order, userId);
  if (accept) {
    if (!deliveryAddress || !deliveryAddress.line1 || !deliveryAddress.city) {
      throw httpError(400, "A delivery address is required to accept this gift.");
    }
    await transition(orderId, "recipient_accepted", {
      actor: "recipient",
      actorUserId: userId,
      set: { delivery_address: encryptAddress(deliveryAddress) },
    });
  } else {
    await transition(orderId, "cancelled", {
      actor: "recipient",
      actorUserId: userId,
      detail: { reason: "declined" },
      set: { cancelled_reason: "Declined by recipient" },
    });
  }
  return toClientOrder(await getOrderOr404(orderId, userId), userId);
}

async function createCheckoutSession(orderId, userId, successUrl, cancelUrl) {
  const order = await getOrderOr404(orderId, userId);
  if (order.sender_id !== userId) throw httpError(403, "Only the sender can pay for this gift.");
  if (order.status !== "recipient_accepted") throw httpError(400, "This gift is not ready for payment yet.");
  if (!stripe) throw httpError(500, "Payments are not configured yet.");
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    client_reference_id: orderId,
    metadata: { orderId },
    payment_intent_data: { metadata: { orderId } },
    line_items: [
      {
        price_data: {
          currency: order.currency.toLowerCase(),
          product_data: { name: order.product_name },
          unit_amount: order.total_cents,
        },
        quantity: 1,
      },
    ],
    success_url: `${successUrl}?orderId=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${cancelUrl}?orderId=${orderId}`,
  });
  await query("UPDATE gift_orders SET stripe_checkout_session_id = ? WHERE id = ?", [session.id, orderId]);
  return { checkoutUrl: session.url };
}

// Fallback for the browser coming back from Stripe. The webhook is the source of truth;
// both paths go through markPaid, so whichever arrives second is a harmless no-op.
async function confirmPayment(orderId, userId, sessionId) {
  const order = await getOrderOr404(orderId, userId);
  if (!stripe) throw httpError(500, "Payments are not configured yet.");
  if (order.paid_at || !["recipient_accepted", "payment_authorized"].includes(order.status)) {
    return toClientOrder(order, userId);
  }
  const session = await stripe.checkout.sessions.retrieve(sessionId || order.stripe_checkout_session_id);
  if (session.payment_status !== "paid") throw httpError(400, "Payment has not completed yet.");
  if (session.id !== order.stripe_checkout_session_id) throw httpError(400, "This payment does not belong to this order.");
  await markPaid(orderId, session.payment_intent, "client");
  return toClientOrder(await getOrderOr404(orderId, userId), userId);
}

async function getOrder(orderId, userId) {
  const order = await getOrderOr404(orderId, userId);
  const events = await query(
    "SELECT status, created_at FROM gift_order_events WHERE order_id = ? ORDER BY id ASC",
    [orderId],
  );
  return {
    ...toClientOrder(order, userId),
    timeline: events
      .filter((event) => Object.prototype.hasOwnProperty.call(TRANSITIONS, event.status))
      .map((event) => ({ status: event.status, at: event.created_at })),
  };
}

// ---- Stripe webhook ----------------------------------------------------------------

async function findOrderForSession(session) {
  const orderId = session.metadata?.orderId || session.client_reference_id;
  if (orderId) return getRawOrder(orderId);
  const rows = await query("SELECT * FROM gift_orders WHERE stripe_checkout_session_id = ?", [session.id]);
  return rows[0] || null;
}

async function handleStripeEvent(event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      if (session.payment_status !== "paid") return { handled: false };
      const order = await findOrderForSession(session);
      if (!order) return { handled: false };
      await markPaid(order.id, session.payment_intent, "stripe");
      return { handled: true };
    }
    case "charge.refunded": {
      const charge = event.data.object;
      if (!charge.payment_intent) return { handled: false };
      const rows = await query("SELECT * FROM gift_orders WHERE stripe_payment_intent_id = ?", [String(charge.payment_intent)]);
      const order = rows[0];
      if (!order) return { handled: false };
      if (["cancelled", "failed"].includes(order.status)) {
        await transition(order.id, "refunded", { actor: "stripe", detail: { eventId: event.id } });
      } else if (order.status !== "refunded") {
        // Refunded from the Stripe dashboard while the order is still live: flag it for ops.
        await addEvent(order.id, "refund_noted", "stripe", { eventId: event.id, status: order.status });
      }
      return { handled: true };
    }
    default:
      return { handled: false };
  }
}

function constructStripeEvent(rawBody, signature) {
  if (!stripe || !env.stripe.webhookSecret) throw httpError(503, "Stripe webhook is not configured.");
  return stripe.webhooks.constructEvent(rawBody, signature, env.stripe.webhookSecret);
}

// ---- Housekeeping (run by jobs/giftMaintenance.js) ------------------------------------

async function expireStaleOrders({ pendingHours = 24, acceptedHours = 24 } = {}) {
  const stale = await query(
    `SELECT id, status FROM gift_orders
     WHERE (status = 'recipient_pending' AND updated_at < DATE_SUB(NOW(6), INTERVAL ? HOUR))
        OR (status = 'recipient_accepted' AND updated_at < DATE_SUB(NOW(6), INTERVAL ? HOUR))
     LIMIT 200`,
    [pendingHours, acceptedHours],
  );
  let expired = 0;
  for (const row of stale) {
    const result = await transition(row.id, "expired", {
      actor: "system",
      detail: { from: row.status },
      set: { cancelled_reason: row.status === "recipient_pending" ? "Recipient did not respond in time" : "Payment was not completed in time" },
    });
    if (result.changed) expired += 1;
  }
  return expired;
}

// Delivery addresses are personal data: once an order is finished, wipe them.
async function purgeFinishedAddresses({ days = 7 } = {}) {
  const result = await query(
    `UPDATE gift_orders SET delivery_address = NULL, address_purged_at = NOW(6)
     WHERE delivery_address IS NOT NULL AND address_purged_at IS NULL
       AND status IN ('delivered','cancelled','failed','refunded','expired')
       AND updated_at < DATE_SUB(NOW(6), INTERVAL ? DAY)`,
    [days],
  );
  return result.affectedRows || 0;
}

// ---- Ops (manual fulfilment) ----------------------------------------------------------

function toOpsOrder(order) {
  return {
    orderId: order.id,
    status: order.status,
    productId: order.product_id,
    productName: order.product_name,
    note: order.note,
    currency: order.currency,
    totalCents: order.total_cents,
    senderId: order.sender_id,
    recipientId: order.recipient_id,
    paidAt: order.paid_at,
    deliveredAt: order.delivered_at,
    cancelledReason: order.cancelled_reason,
    refundId: order.refund_id,
    provider: order.provider,
    providerOrderId: order.provider_order_id,
    trackingUrl: order.tracking_url,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    deliveryAddress: readAddress(order),
  };
}

async function opsListOrders(status) {
  const wanted = status || "merchant_preparing";
  if (!Object.prototype.hasOwnProperty.call(TRANSITIONS, wanted)) throw httpError(400, "Unknown status.");
  const rows = await query(
    "SELECT * FROM gift_orders WHERE status = ? ORDER BY updated_at ASC LIMIT 100",
    [wanted],
  );
  return rows.map(toOpsOrder);
}

async function opsGetOrder(orderId) {
  const order = await getRawOrder(orderId);
  if (!order) throw httpError(404, "Gift order not found");
  const events = await query(
    "SELECT status, actor, detail, created_at FROM gift_order_events WHERE order_id = ? ORDER BY id ASC",
    [orderId],
  );
  return { ...toOpsOrder(order), events };
}

async function opsAdvanceOrder(orderId, body = {}) {
  const to = body.status;
  if (!OPS_TARGETS.includes(to)) throw httpError(400, `status must be one of: ${OPS_TARGETS.join(", ")}`);
  const set = {};
  if (body.trackingUrl) {
    if (!/^https?:\/\//i.test(String(body.trackingUrl))) throw httpError(400, "trackingUrl must be an http(s) link.");
    set.tracking_url = String(body.trackingUrl).slice(0, 500);
  }
  if (body.provider) set.provider = String(body.provider).slice(0, 40);
  if (body.providerOrderId) set.provider_order_id = String(body.providerOrderId).slice(0, 255);
  if (to === "delivered") set.delivered_at = true;
  if (to === "failed" || to === "cancelled") set.cancelled_reason = String(body.reason || "Cancelled by support").slice(0, 255);
  const result = await transition(orderId, to, {
    actor: "ops",
    detail: body.note ? { note: String(body.note).slice(0, 500) } : null,
    set,
  });
  if (!result.order) throw httpError(404, "Gift order not found");
  if (!result.changed) throw httpError(409, `Cannot move an order from ${result.order.status} to ${to}.`);
  return toOpsOrder(result.order);
}

// Test seam: lets tests swap in a fake Stripe client.
function __setStripeForTests(client) {
  stripe = client;
}

module.exports = {
  __setStripeForTests,
  TRANSITIONS,
  TERMINAL,
  createOrder,
  respondToOrder,
  createCheckoutSession,
  confirmPayment,
  getOrder,
  transition,
  markPaid,
  handleStripeEvent,
  constructStripeEvent,
  expireStaleOrders,
  purgeFinishedAddresses,
  opsListOrders,
  opsGetOrder,
  opsAdvanceOrder,
};
