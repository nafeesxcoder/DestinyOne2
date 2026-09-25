const crypto = require("crypto");
const Stripe = require("stripe");
const { query } = require("../config/db");
const env = require("../config/env");
const chatService = require("./chatService");
const pushService = require("./pushService");
const { computeGiftOrderTotal, productRules } = require("./giftPricing");

const stripe = env.stripe.secretKey ? new Stripe(env.stripe.secretKey) : null;

function parseJsonColumn(value, fallback) {
  if (value === null || value === undefined) return fallback;
  return typeof value === "string" ? JSON.parse(value) : value;
}

async function getOrderOr404(orderId, userId) {
  const rows = await query("SELECT * FROM gift_orders WHERE id = ?", [orderId]);
  if (!rows.length) {
    const err = new Error("Gift order not found");
    err.status = 404;
    throw err;
  }
  const order = rows[0];
  if (order.sender_id !== userId && order.recipient_id !== userId) {
    const err = new Error("You do not have access to this gift order.");
    err.status = 403;
    throw err;
  }
  return order;
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
    deliveryAddress: !isSender
      ? parseJsonColumn(order.delivery_address, null)
      : undefined,
  };
}

async function notifyGiftOrderCreated(order) {
  const isReady = order.status === "recipient_accepted";
  await pushService.notifyUser(order.recipient_id, {
    title: "You received a gift! 🎁",
    body: isReady
      ? `Someone sent you a gift: ${order.product_name}`
      : `Someone wants to send you a gift: ${order.product_name}. Tap to respond.`,
    data: {
      type: "gift_order",
      orderId: order.id,
      conversationId: order.conversation_id,
    },
  });
}

async function notifyGiftPaymentConfirmed(order) {
  await pushService.notifyUser(order.recipient_id, {
    title: "Your gift is on the way! 🎁",
    body: `${order.product_name} has been paid for and is being prepared.`,
    data: {
      type: "gift_payment_confirmed",
      orderId: order.id,
      conversationId: order.conversation_id,
    },
  });
  await pushService.notifyUser(order.sender_id, {
    title: "Payment confirmed",
    body: `Your gift order for ${order.product_name} is being prepared.`,
    data: {
      type: "gift_payment_confirmed",
      orderId: order.id,
      conversationId: order.conversation_id,
    },
  });
}

async function createOrder(conversationId, senderId, input) {
  const participants = await chatService.assertParticipant(
    conversationId,
    senderId,
  );
  const recipientId = participants.find((id) => id !== senderId);
  if (!recipientId) {
    const err = new Error("Could not determine the recipient.");
    err.status = 400;
    throw err;
  }
  if (!productRules[input.productId]) {
    const err = new Error("Unknown gift product.");
    err.status = 400;
    throw err;
  }
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
      hasAddress ? "recipient_accepted" : "recipient_pending",
      hasAddress ? JSON.stringify(address) : null,
    ],
  );
  const order = await getOrderOr404(id, senderId);
  notifyGiftOrderCreated(order).catch(() => undefined);
  return toClientOrder(order, senderId);
}

async function respondToOrder(orderId, userId, accept, deliveryAddress) {
  const order = await getOrderOr404(orderId, userId);
  if (order.recipient_id !== userId) {
    const err = new Error("Only the recipient can respond to this gift.");
    err.status = 403;
    throw err;
  }
  if (order.status !== "recipient_pending") {
    return toClientOrder(order, userId);
  }
  if (accept) {
    if (!deliveryAddress || !deliveryAddress.line1 || !deliveryAddress.city) {
      const err = new Error(
        "A delivery address is required to accept this gift.",
      );
      err.status = 400;
      throw err;
    }
    await query(
      `UPDATE gift_orders SET status = 'recipient_accepted', delivery_address = ? WHERE id = ?`,
      [JSON.stringify(deliveryAddress), orderId],
    );
  } else {
    await query(`UPDATE gift_orders SET status = 'cancelled' WHERE id = ?`, [
      orderId,
    ]);
  }
  const updated = await getOrderOr404(orderId, userId);
  return toClientOrder(updated, userId);
}

async function createCheckoutSession(orderId, userId, successUrl, cancelUrl) {
  const order = await getOrderOr404(orderId, userId);
  if (order.sender_id !== userId) {
    const err = new Error("Only the sender can pay for this gift.");
    err.status = 403;
    throw err;
  }
  if (order.status !== "recipient_accepted") {
    const err = new Error("This gift is not ready for payment yet.");
    err.status = 400;
    throw err;
  }
  if (!stripe) {
    const err = new Error("Payments are not configured yet.");
    err.status = 500;
    throw err;
  }
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
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
  await query(
    `UPDATE gift_orders SET stripe_checkout_session_id = ? WHERE id = ?`,
    [session.id, orderId],
  );
  return { checkoutUrl: session.url };
}

async function confirmPayment(orderId, userId, sessionId) {
  const order = await getOrderOr404(orderId, userId);
  if (!stripe) {
    const err = new Error("Payments are not configured yet.");
    err.status = 500;
    throw err;
  }
  if (
    order.status === "payment_authorized" ||
    order.status === "merchant_preparing"
  ) {
    return toClientOrder(order, userId);
  }
  const session = await stripe.checkout.sessions.retrieve(
    sessionId || order.stripe_checkout_session_id,
  );
  if (session.payment_status !== "paid") {
    const err = new Error("Payment has not completed yet.");
    err.status = 400;
    throw err;
  }
  await query(
    `UPDATE gift_orders SET status = 'merchant_preparing', stripe_payment_intent_id = ? WHERE id = ?`,
    [String(session.payment_intent || ""), orderId],
  );
  const updated = await getOrderOr404(orderId, userId);
  notifyGiftPaymentConfirmed(updated).catch(() => undefined);
  return toClientOrder(updated, userId);
}

async function getOrder(orderId, userId) {
  const order = await getOrderOr404(orderId, userId);
}

module.exports = {
  createOrder,
  respondToOrder,
  createCheckoutSession,
  confirmPayment,
  getOrder,
};
