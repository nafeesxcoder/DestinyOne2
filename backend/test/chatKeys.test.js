const test = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "a";
process.env.JWT_REFRESH_SECRET = "b";

// In-memory stand-in for the few tables chatService touches.
// Mutual matches: A <-> C and B <-> C (C has two matches).
const A = "aaaaaaaa-0000-0000-0000-000000000001";
const B = "bbbbbbbb-0000-0000-0000-000000000002";
const C = "cccccccc-0000-0000-0000-000000000003";
const pairs = [[A, C], [B, C]];
let messages = [];

const fakeQuery = async (sql, params = []) => {
  if (/FROM mutual_matches/.test(sql)) {
    const [u1, u2] = params;
    const hit = pairs.find(([x, y]) => (x === u1 && y === u2) || (x === u2 && y === u1));
    return hit ? [{ user_a_id: hit[0], user_b_id: hit[1] }] : [];
  }
  if (/^INSERT INTO chat_messages/.test(sql.trim())) {
    const [id, conversation_id, sender_id, message_type, payload, created_at_ms] = params;
    messages.push({ id, conversation_id, sender_id, message_type, payload, status: "sent", created_at_ms, updated_at_ms: created_at_ms, deleted_for_everyone: 0, hidden_by: null });
    return [];
  }
  if (/SELECT \* FROM chat_messages WHERE id = \? AND conversation_id = \?/.test(sql)) {
    return messages.filter((m) => m.id === params[0] && m.conversation_id === params[1]);
  }
  if (/SELECT \* FROM chat_messages WHERE conversation_id = \?/.test(sql)) {
    return messages.filter((m) => m.conversation_id === params[0]).sort((x, y) => x.created_at_ms - y.created_at_ms);
  }
  return []; // blocks, couple_connections, settings, expiry, updates
};

const stub = (rel, exports) => {
  const p = require.resolve(rel);
  require.cache[p] = { id: p, filename: p, loaded: true, exports };
};
stub("../src/config/db", { query: fakeQuery, pool: {} });
stub("../src/services/pushService", { notifyUser: async () => undefined });
stub("../src/services/realtime", { emitToUser: () => undefined });

const chat = require("../src/services/chatService");

const send = (from, to, text) =>
  chat.sendMessage(to, from, { id: `${from}-${text}`, type: "text", text, createdAt: Date.now() + messages.length });
const texts = (list) => list.map((m) => m.text).sort();

test.beforeEach(() => { messages = []; });

test("both people in a mutual-match chat read the same messages", async () => {
  await send(A, C, "hi from A");
  await send(C, A, "hi from C");
  assert.deepEqual(texts(await chat.listMessages(C, A)), ["hi from A", "hi from C"]);
  assert.deepEqual(texts(await chat.listMessages(A, C)), ["hi from A", "hi from C"]);
});

test("a member never sees what someone else sent to the same partner", async () => {
  await send(A, C, "for C from A");
  await send(B, C, "for C from B");
  assert.deepEqual(texts(await chat.listMessages(C, A)), ["for C from A"]);
  assert.deepEqual(texts(await chat.listMessages(C, B)), ["for C from B"]);
});

test("mutual-match messages are stored under one shared sorted key", async () => {
  await send(C, A, "x");
  await send(A, C, "y");
  const keys = [...new Set(messages.map((m) => m.conversation_id))];
  assert.deepEqual(keys, [`dm:${A}:${C}`]);
});

test("people who are not matched cannot open each other's chat", async () => {
  await assert.rejects(() => chat.listMessages(B, A), { status: 403 });
});
