const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

process.env.JWT_ACCESS_SECRET = "a";
process.env.JWT_REFRESH_SECRET = "b";
process.env.GIFT_ADDRESS_KEY = "00".repeat(32);
process.env.GIFT_OPS_KEY = "ops-secret";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
process.env.STRIPE_SECRET_KEY = "sk_test_x";

// ---- tiny in-memory stand-in for the two tables the gift code touches ----
const orders = new Map();
const events = [];
let eventId = 0;
const fakeDb = {
  async query(sql, params = []) {
    sql = sql.replace(/\s+/g, " ").trim();
    if (sql.startsWith("SELECT * FROM gift_orders WHERE id = ?")) {
      const o = orders.get(params[0]);
      return o ? [{ ...o }] : [];
    }
    if (sql.startsWith("INSERT INTO gift_orders")) {
      const [id, conversation_id, sender_id, recipient_id, product_id, product_name, note, currency, total_cents, status, delivery_address] = params;
      orders.set(id, { id, conversation_id, sender_id, recipient_id, product_id, product_name, note, currency, total_cents, status, delivery_address, paid_at: null, delivered_at: null, cancelled_reason: null, refund_id: null, provider: null, provider_order_id: null, tracking_url: null, stripe_payment_intent_id: null, stripe_checkout_session_id: null, created_at: "t", updated_at: "t" });
      return { affectedRows: 1 };
    }
    if (sql.startsWith("INSERT INTO gift_order_events")) {
      events.push({ id: ++eventId, order_id: params[0], status: params[1], actor: params[2], detail: params[3], created_at: "t" });
      return { affectedRows: 1 };
    }
    if (sql.startsWith("SELECT status, created_at FROM gift_order_events")) {
      return events.filter((e) => e.order_id === params[0]).map((e) => ({ status: e.status, created_at: e.created_at }));
    }
    // ---- gift-limit queries used by assertGiftLimits() ----
    if (sql.startsWith("SELECT COUNT(*) AS c FROM gift_orders WHERE sender_id = ? AND status IN")) {
      const c = [...orders.values()].filter((o) => o.sender_id === params[0] && ["recipient_pending", "recipient_accepted"].includes(o.status)).length;
      return [{ c }];
    }
    if (sql.startsWith("SELECT TIMESTAMPDIFF(HOUR, created_at, NOW()) AS age_hours FROM users")) {
      return [{ age_hours: 48 }];
    }
    if (sql.startsWith("SELECT COUNT(*) AS c FROM gift_orders WHERE sender_id = ? AND created_at >")) {
      const c = [...orders.values()].filter((o) => o.sender_id === params[0]).length;
      return [{ c }];
    }
    if (sql.startsWith("SELECT COUNT(*) AS c FROM gift_orders WHERE sender_id = ? AND recipient_id = ? AND created_at >")) {
      const c = [...orders.values()].filter((o) => o.sender_id === params[0] && o.recipient_id === params[1]).length;
      return [{ c }];
    }
    if (sql.startsWith("UPDATE gift_orders SET status = ?")) {
      const m = sql.match(/SET (.*) WHERE id = \? AND status IN/);
      const cols = m[1].split(", ");
      const values = [...params];
      const target = {};
      for (const c of cols) {
        const [name, rhs] = c.split(" = ");
        target[name] = rhs === "NOW(6)" ? "now" : values.shift();
      }
      const id = values.shift();
      const o = orders.get(id);
      if (!o || !values.includes(o.status)) return { affectedRows: 0 };
      Object.assign(o, target);
      return { affectedRows: 1 };
    }
    if (sql.startsWith("UPDATE gift_orders SET refund_id")) {
      Object.assign(orders.get(params[2]), { refund_id: params[0], stripe_payment_intent_id: params[1] });
      return { affectedRows: 1 };
    }
    if (sql.startsWith("UPDATE gift_orders SET stripe_checkout_session_id")) {
      orders.get(params[1]).stripe_checkout_session_id = params[0];
      return { affectedRows: 1 };
    }
    throw new Error(`Unhandled SQL in test: ${sql}`);
  },
};
const dbPath = require.resolve("../src/config/db");
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { query: fakeDb.query, pool: {} } };
const chatPath = require.resolve("../src/services/chatService");
require.cache[chatPath] = { id: chatPath, filename: chatPath, loaded: true, exports: { assertParticipant: async () => ["alice", "bob"] } };
const pushPath = require.resolve("../src/services/pushService");
const pushed = [];
require.cache[pushPath] = { id: pushPath, filename: pushPath, loaded: true, exports: { notifyUser: async (userId, payload) => pushed.push({ userId, title: payload.title }) } };

const gifts = require("../src/services/giftService");
const { encryptAddress, decryptAddress } = require("../src/services/giftCrypto");
const Stripe = require("stripe");

// Matches exactly what validateDeliveryAddress() returns (null optional fields included),
// so tests can compare the decrypted address to this constant.
const ADDRESS = {
  name: "Bob Recipient",
  phone: "+14165550123",
  line1: "1 Main St",
  line2: null,
  city: "Toronto",
  state: "ON",
  postal: "M5V 2T6",
  country: "CA",
  instructions: null,
};
const productId = Object.keys(require("../src/services/giftPricing").productRules)[0];

async function newOrder(withAddress = true) {
  const order = await gifts.createOrder("conv1", "alice", { productId });
  if (withAddress) {
    await gifts.respondToOrder(order.orderId, "bob", true, ADDRESS);
  }
  return order.orderId;
}

// Installs a fake Stripe client whose paymentIntents.retrieve() returns the
// correct amount/currency for the given order. Returns a restore function.
function installFakeStripe(orderId, overrides = {}) {
  const real = new Stripe("sk_test_x");
  const order = orders.get(orderId);
  const fake = {
    paymentIntents: {
      retrieve: async (piId) => ({
        id: piId,
        amount_received: order.total_cents,
        currency: order.currency.toLowerCase(),
        metadata: { orderId },
        ...overrides,
      }),
    },
    refunds: { create: async () => ({ id: "re_fake" }) },
    webhooks: real.webhooks,
  };
  gifts.__setStripeForTests(fake);
  return () => gifts.__setStripeForTests(real);
}

test.beforeEach(() => {
  // Each test starts with a clean fake DB so the new gift-limit counters do not
  // leak from one test into the next.
  orders.clear();
  events.length = 0;
  eventId = 0;
});

test("address encryption round-trips and is not plaintext", () => {
  const stored = encryptAddress(ADDRESS);
  assert.ok(!stored.includes("Toronto"));
  assert.deepEqual(decryptAddress(stored), ADDRESS);
  assert.deepEqual(decryptAddress(JSON.stringify(ADDRESS)), ADDRESS);
});

test("sender never sees the address, recipient does", async () => {
  const id = await newOrder();
  assert.equal((await gifts.getOrder(id, "alice")).deliveryAddress, undefined);
  assert.deepEqual((await gifts.getOrder(id, "bob")).deliveryAddress, ADDRESS);
  assert.ok(!orders.get(id).delivery_address.includes("Toronto"), "stored encrypted");
});

test("payment is idempotent: webhook + client confirm both land once", async () => {
  const id = await newOrder();
  const restore = installFakeStripe(id);
  const first = await gifts.markPaid(id, "pi_1", "stripe");
  const second = await gifts.markPaid(id, "pi_1", "client");
  assert.equal(first.changed, true);
  assert.equal(second.changed, false);
  assert.equal(orders.get(id).status, "merchant_preparing");
  assert.equal(events.filter((e) => e.order_id === id && e.status === "merchant_preparing").length, 1);
  restore();
});

test("illegal transitions are refused", async () => {
  const id = await newOrder();
  const r = await gifts.transition(id, "delivered");
  assert.equal(r.changed, false);
  assert.equal(orders.get(id).status, "recipient_accepted");
});

test("ops can walk an order to delivered, then it is final", async () => {
  const id = await newOrder();
  const restore = installFakeStripe(id);
  await gifts.markPaid(id, "pi_2", "stripe");
  restore();
  await gifts.opsAdvanceOrder(id, { status: "courier_assigned", provider: "manual", trackingUrl: "https://t.example/1" });
  await gifts.opsAdvanceOrder(id, { status: "delivered" });
  assert.equal(orders.get(id).status, "delivered");
  assert.equal(orders.get(id).tracking_url, "https://t.example/1");
  await assert.rejects(() => gifts.opsAdvanceOrder(id, { status: "failed" }), /Cannot move/);
  const timeline = (await gifts.getOrder(id, "bob")).timeline.map((e) => e.status);
  assert.deepEqual(timeline, ["recipient_pending", "recipient_accepted", "merchant_preparing", "courier_assigned", "delivered"]);
});

test("failed delivery after payment triggers a refund", async () => {
  const id = await newOrder();
  const order = orders.get(id);
  const seen = [];
  const real = new Stripe("sk_test_x");
  gifts.__setStripeForTests({
    paymentIntents: {
      retrieve: async (piId) => ({
        id: piId,
        amount_received: order.total_cents,
        currency: order.currency.toLowerCase(),
        metadata: { orderId: id },
      }),
    },
    refunds: { create: async (params) => { seen.push(params); return { id: "re_1" }; } },
    webhooks: real.webhooks,
  });
  await gifts.markPaid(id, "pi_3", "stripe");
  await gifts.opsAdvanceOrder(id, { status: "failed", reason: "Nobody home" });
  gifts.__setStripeForTests(real);
  assert.equal(seen[0].payment_intent, "pi_3");
  assert.equal(orders.get(id).status, "refunded");
  assert.equal(orders.get(id).refund_id, "re_1");
});

test("webhook signature is verified and checkout.session.completed marks paid", async () => {
  const id = await newOrder();
  const order = orders.get(id);
  const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.completed", data: { object: { id: "cs_1", payment_status: "paid", payment_intent: "pi_4", amount_total: order.total_cents, currency: order.currency.toLowerCase(), metadata: { orderId: id } } } });
  const restore = installFakeStripe(id);
  const stripe = new Stripe("sk_test_x");
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_test" });
  const event = gifts.constructStripeEvent(Buffer.from(payload), header);
  await gifts.handleStripeEvent(event);
  restore();
  assert.equal(orders.get(id).status, "merchant_preparing");
  assert.throws(() => gifts.constructStripeEvent(Buffer.from(payload), "t=1,v1=bad"));
});


test("sender-supplied address is ignored (consent bypass blocked)", async () => {
  // Sender tries to smuggle an address and skip recipient consent.
  const order = await gifts.createOrder("conv1", "alice", {
    productId,
    deliveryAddress: { line1: "Hacker St", city: "Evilville", country: "US" },
  });
  assert.equal(order.status, "recipient_pending", "order must wait for recipient consent");
  assert.equal(order.deliveryAddress, undefined, "sender must not see any address");
  assert.equal(orders.get(order.orderId).delivery_address, null, "no address may be stored before recipient accepts");
});


test("encryptAddress refuses to store plain text without GIFT_ADDRESS_KEY", () => {
  const savedKey = process.env.GIFT_ADDRESS_KEY;
  const savedNodeEnv = process.env.NODE_ENV;
  try {
    // Simulate a server where the key was never set. NODE_ENV=test keeps env.js
    // from throwing at load time; the check we care about is in encryptAddress().
    process.env.NODE_ENV = "test";
    delete process.env.GIFT_ADDRESS_KEY;
    delete require.cache[require.resolve("../src/config/env")];
    delete require.cache[require.resolve("../src/services/giftCrypto")];
    const freshCrypto = require("../src/services/giftCrypto");
    assert.throws(
      () => freshCrypto.encryptAddress({ line1: "1 Main St", city: "Toronto" }),
      /GIFT_ADDRESS_KEY is not configured/,
    );
    // A null address is still allowed (nothing to protect).
    assert.equal(freshCrypto.encryptAddress(null), null);
  } finally {
    if (savedKey === undefined) delete process.env.GIFT_ADDRESS_KEY;
    else process.env.GIFT_ADDRESS_KEY = savedKey;
    if (savedNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = savedNodeEnv;
    delete require.cache[require.resolve("../src/config/env")];
    delete require.cache[require.resolve("../src/services/giftCrypto")];
  }
});


test("checkout redirect URLs must point at an allowed origin", async () => {
  const id = await newOrder(); // recipient accepted
  // Evil origin must be rejected before Stripe is ever called.
  await assert.rejects(
    () => gifts.createCheckoutSession(id, "alice", "https://evil.example/ok", "https://destinyone.co/cancel"),
    (err) => err.status === 400 && /not an allowed redirect origin/.test(err.message),
  );
  await assert.rejects(
    () => gifts.createCheckoutSession(id, "alice", "https://destinyone.co/ok", "https://evil.example/cancel"),
    (err) => err.status === 400 && /not an allowed redirect origin/.test(err.message),
  );
  // Non-URL garbage is rejected too.
  await assert.rejects(
    () => gifts.createCheckoutSession(id, "alice", "not-a-url", "https://destinyone.co/cancel"),
    (err) => err.status === 400 && /valid absolute URL/.test(err.message),
  );
});


test("gift limits: per-recipient daily cap blocks a third gift", async () => {
  // The fake DB counts across the whole file, so just drive the code path directly.
  const { GIFT_LIMITS } = require("../src/services/giftPricing");
  const before = [...orders.values()].filter((o) => o.sender_id === "alice" && o.recipient_id === "bob").length;
  const remaining = Math.max(0, GIFT_LIMITS.maxOrdersPerRecipientPerDay - before);
  for (let i = 0; i < remaining; i += 1) {
    await gifts.createOrder("conv1", "alice", { productId });
  }
  await assert.rejects(
    () => gifts.createOrder("conv1", "alice", { productId }),
    (err) => err.status === 429 && /too many gifts to this person/i.test(err.message),
  );
});


test("delivery address is validated: bad input is rejected", () => {
  const { validateDeliveryAddress } = require("../src/services/giftAddressValidator");

  const base = {
    name: "Bob",
    phone: "+14165550123",
    line1: "1 Main St",
    city: "Toronto",
    state: "ON",
    postal: "M5V 2T6",
    country: "CA",
  };

  const clean = validateDeliveryAddress({ ...base, name: "  Bob  ", extra: "drop me" });
  assert.equal(clean.name, "Bob");
  assert.equal(clean.extra, undefined);

  assert.throws(() => validateDeliveryAddress({ ...base, country: "FR" }), /country must be one of/);
  assert.throws(() => validateDeliveryAddress({ ...base, line1: "" }), /line1 is required/);
  assert.throws(() => validateDeliveryAddress({ ...base, line1: "<script>x</script>" }), /invalid characters/);
  assert.throws(() => validateDeliveryAddress({ ...base, postal: "12345" }), /Canadian postal/);
  assert.throws(() => validateDeliveryAddress({ ...base, phone: "abc" }), /phone/);
  assert.throws(() => validateDeliveryAddress({ ...base, phone: "" }), /phone is required/);
});


test("markPaid refuses a payment whose amount/currency does not match the order", async () => {
  const id = await newOrder();
  const order = orders.get(id);
  const real = new Stripe("sk_test_x");
  gifts.__setStripeForTests({
    paymentIntents: {
      retrieve: async (piId) => ({
        id: piId,
        amount_received: order.total_cents - 100, // underpaid by 1 unit
        currency: order.currency.toLowerCase(),
        metadata: { orderId: id },
      }),
    },
    webhooks: real.webhooks,
  });
  await assert.rejects(
    () => gifts.markPaid(id, "pi_bad", "stripe"),
    (err) => err.status === 400 && /does not match/.test(err.message),
  );
  gifts.__setStripeForTests(real);
  assert.equal(orders.get(id).status, "recipient_accepted"); // not moved
  assert.ok(events.find((e) => e.order_id === id && e.status === "payment_mismatch"));
});
