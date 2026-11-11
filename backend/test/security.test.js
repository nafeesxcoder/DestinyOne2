const test = require("node:test");
const assert = require("node:assert/strict");

// Set test environment
process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "a";
process.env.JWT_REFRESH_SECRET = "b";
process.env.GIFT_ADDRESS_KEY = "00".repeat(32);
process.env.GIFT_OPS_KEY = "ops-secret";

// Mock the DB (similar to gifts.test.js)
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
    if (sql.startsWith("SELECT * FROM gift_orders WHERE sender_id")) {
      return Array.from(orders.values()).filter(o => o.sender_id === params[0] || o.recipient_id === params[0]);
    }
    if (sql.startsWith("INSERT INTO gift_orders")) {
      const [id, conversation_id, sender_id, recipient_id, product_id, product_name, note, currency, total_cents, status, delivery_address] = params;
      orders.set(id, { id, conversation_id, sender_id, recipient_id, product_id, product_name, note, currency, total_cents, status, delivery_address, paid_at: null, created_at: "t", updated_at: "t" });
      return { affectedRows: 1 };
    }
    if (sql.startsWith("INSERT INTO gift_order_events")) {
      events.push({ id: ++eventId, order_id: params[0], status: params[1], actor: params[2], detail: params[3], created_at: "t" });
      return { affectedRows: 1 };
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
    if (sql.startsWith("SELECT COUNT(*) AS c FROM gift_orders WHERE sender_id = ? AND status IN")) {
      const c = [...orders.values()].filter((o) => o.sender_id === params[0] && ["recipient_pending", "recipient_accepted"].includes(o.status)).length;
      return [{ c }];
    }
    if (sql.startsWith("SELECT TIMESTAMPDIFF(HOUR, created_at, NOW()) AS age_hours FROM users")) {
      return [{ age_hours: 48 }];
    }
    if (sql.startsWith("SELECT COUNT(*) AS c FROM gift_orders WHERE sender_id = ? AND created_at >")) {
      return [{ c: 0 }];
    }
    if (sql.startsWith("SELECT COUNT(*) AS c FROM gift_orders WHERE sender_id = ? AND recipient_id = ? AND created_at >")) {
      return [{ c: 0 }];
    }
    return []; // default for unknown
  },
};

const dbPath = require.resolve("../src/config/db");
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { query: fakeDb.query, pool: {} } };

const chatPath = require.resolve("../src/services/chatService");
require.cache[chatPath] = { id: chatPath, filename: chatPath, loaded: true, exports: { assertParticipant: async (conversationId, userId) => {
  // Mock: alice and bob are participants. charlie is not.
  if (userId === "charlie") throw Object.assign(new Error("You do not have access to this conversation."), { status: 403 });
  return ["alice", "bob"];
} } };

const pushPath = require.resolve("../src/services/pushService");
require.cache[pushPath] = { id: pushPath, filename: pushPath, loaded: true, exports: { notifyUser: async () => {} } };

const safetyPath = require.resolve("../src/services/safetyService");
require.cache[safetyPath] = { id: safetyPath, filename: safetyPath, loaded: true, exports: { isBlocked: async () => false } };

const gifts = require("../src/services/giftService");
const { productRules } = require("../src/services/giftPricing");
const productId = Object.keys(productRules)[0];

test.beforeEach(() => {
  orders.clear();
  events.length = 0;
  eventId = 0;
});

test("non-participant cannot create a gift order (403)", async () => {
  await assert.rejects(
    () => gifts.createOrder("conv1", "charlie", { productId }),
    (err) => err.status === 403
  );
});

test("non-participant cannot read someone else's gift order (403)", async () => {
  const order = await gifts.createOrder("conv1", "alice", { productId });
  await assert.rejects(
    () => gifts.getOrder(order.orderId, "charlie"),
    (err) => err.status === 403
  );
});

test("tampered price in request is ignored; server uses catalog price", async () => {
  const order = await gifts.createOrder("conv1", "alice", {
    productId,
    totalCents: 1, // Attacker tries to pay 1 cent
  });
  // The order total must be > 1 (catalog price)
  assert.ok(order.totalCents > 1, `Expected catalog price, got ${order.totalCents}`);
});
