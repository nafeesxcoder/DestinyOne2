const test = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "a";
process.env.JWT_REFRESH_SECRET = "b";

const calls = [];
let profileComplete = true;
const fakeQuery = async (sql, params = []) => {
  calls.push({ sql, params });
  if (/SELECT onboarding_complete FROM profiles/.test(sql)) return [{ onboarding_complete: profileComplete ? 1 : 0 }];
  if (/FROM profiles p/.test(sql)) {
    return [{ user_id: "u2", first_name: "Asha", age: 27, city: "Austin", profession: "Designer", verified: 1, photo: "/uploads/a.jpg" }];
  }
  return [];
};
const dbPath = require.resolve("../src/config/db");
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { query: fakeQuery, pool: {} } };

const couple = require("../src/services/coupleService");

test.beforeEach(() => { calls.length = 0; profileComplete = true; });

test("name search needs at least 3 letters and not too long", async () => {
  await assert.rejects(() => couple.searchByName("u1", "as"), { status: 400 });
  await assert.rejects(() => couple.searchByName("u1", "  a "), { status: 400 });
  await assert.rejects(() => couple.searchByName("u1", "x".repeat(41)), { status: 400 });
  assert.equal(calls.length, 0, "no database query for invalid input");
});

test("members with an unfinished profile cannot search", async () => {
  profileComplete = false;
  await assert.rejects(() => couple.searchByName("u1", "asha"), { status: 403 });
});

test("name search only returns public fields and limits who can be found", async () => {
  const people = await couple.searchByName("u1", "  Asha ");
  assert.equal(people.length, 1);
  assert.deepEqual(Object.keys(people[0]).sort(), ["age", "city", "display_name", "member_id", "photo", "profession", "relation", "verified"]);
  assert.equal(people[0].relation, "none");
  const q = calls.find((c) => /FROM profiles p/.test(c.sql));
  assert.match(q.sql, /p\.searchable = 1/);
  assert.match(q.sql, /p\.onboarding_complete = 1/);
  assert.match(q.sql, /deleted_at IS NULL/);
  assert.match(q.sql, /deactivated_at IS NULL/);
  assert.match(q.sql, /NOT EXISTS/);
  assert.match(q.sql, /LIMIT 10/);
  assert.ok(!/phone|email/i.test(q.sql.split("FROM profiles p")[0]), "phone/email are never selected");
});

test("LIKE wildcards in the search text are escaped", async () => {
  await couple.searchByName("u1", "100%_ok");
  const q = calls.find((c) => /FROM profiles p/.test(c.sql));
  assert.ok(q.params.includes("100\\%\\_ok%"));
  assert.ok(q.params.includes("% 100\\%\\_ok%"));
});

test("exact phone/email lookup also ignores deleted and blocked members", async () => {
  await couple.searchByIdentifier("+15551234567", "u1");
  const q = calls.find((c) => /FROM users u/.test(c.sql));
  assert.match(q.sql, /deleted_at IS NULL/);
  assert.match(q.sql, /NOT EXISTS/);
});
