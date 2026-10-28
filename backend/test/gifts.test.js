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

const ADDRESS = { line1: "1 Main St", city: "Toronto", postal: "M5V" };
const productId = Object.keys(require("../src/services/giftPricing").productRules)[0];

async function newOrder(withAddress = true) {
  const order = await gifts.createOrder("conv1", "alice", { productId, deliveryAddress: withAddress ? ADDRESS : undefined });
  return order.orderId;
}

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
  const first = await gifts.markPaid(id, "pi_1", "stripe");
  const second = await gifts.markPaid(id, "pi_1", "client");
  assert.equal(first.changed, true);
  assert.equal(second.changed, false);
  assert.equal(orders.get(id).status, "merchant_preparing");
  assert.equal(events.filter((e) => e.order_id === id && e.status === "merchant_preparing").length, 1);
});

test("illegal transitions are refused", async () => {
  const id = await newOrder();
  const r = await gifts.transition(id, "delivered");
  assert.equal(r.changed, false);
  assert.equal(orders.get(id).status, "recipient_accepted");
});

test("ops can walk an order to delivered, then it is final", async () => {
  const id = await newOrder();
  await gifts.markPaid(id, "pi_2", "stripe");
  await gifts.opsAdvanceOrder(id, { status: "courier_assigned", provider: "manual", trackingUrl: "https://t.example/1" });
  await gifts.opsAdvanceOrder(id, { status: "delivered" });
  assert.equal(orders.get(id).status, "delivered");
  assert.equal(orders.get(id).tracking_url, "https://t.example/1");
  await assert.rejects(() => gifts.opsAdvanceOrder(id, { status: "failed" }), /Cannot move/);
  const timeline = (await gifts.getOrder(id, "bob")).timeline.map((e) => e.status);
  assert.deepEqual(timeline, ["recipient_accepted", "merchant_preparing", "courier_assigned", "delivered"]);
});

test("failed delivery after payment triggers a refund", async () => {
  const id = await newOrder();
  await gifts.markPaid(id, "pi_3", "stripe");
  const seen = [];
  const real = new Stripe("sk_test_x");
  gifts.__setStripeForTests({ refunds: { create: async (params) => { seen.push(params); return { id: "re_1" }; } }, webhooks: real.webhooks });
  await gifts.opsAdvanceOrder(id, { status: "failed", reason: "Nobody home" });
  gifts.__setStripeForTests(real);
  assert.equal(seen[0].payment_intent, "pi_3");
  assert.equal(orders.get(id).status, "refunded");
  assert.equal(orders.get(id).refund_id, "re_1");
});

test("webhook signature is verified and checkout.session.completed marks paid", async () => {
  const id = await newOrder();
  const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.completed", data: { object: { id: "cs_1", payment_status: "paid", payment_intent: "pi_4", metadata: { orderId: id } } } });
  const stripe = new Stripe("sk_test_x");
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_test" });
  const event = gifts.constructStripeEvent(Buffer.from(payload), header);
  await gifts.handleStripeEvent(event);
  assert.equal(orders.get(id).status, "merchant_preparing");
  assert.throws(() => gifts.constructStripeEvent(Buffer.from(payload), "t=1,v1=bad"));
});
