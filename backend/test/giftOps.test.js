const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");

process.env.NODE_ENV = "test";
process.env.GIFT_ADDRESS_KEY = process.env.GIFT_ADDRESS_KEY || "00".repeat(32);
process.env.JWT_ACCESS_SECRET = "a";
process.env.JWT_REFRESH_SECRET = "b";
process.env.GIFT_OPS_KEY = "ops-secret";

const express = require("express");
const router = require("../src/routes/giftOpsRoutes");

function serve() {
  const app = express();
  app.use(express.json());
  app.use("/ops/gifts", router);
  return new Promise((resolve) => {
    const server = http.createServer(app).listen(0, () => resolve(server));
  });
}

test("ops console page loads without a key, data routes need the key", async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/ops/gifts`;
  try {
    const page = await fetch(`${base}/console`);
    assert.equal(page.status, 200);
    assert.match(page.headers.get("content-type"), /text\/html/);
    const html = await page.text();
    assert.match(html, /Gift orders/);
    assert.ok(!html.includes("ops-secret"));

    const noKey = await fetch(`${base}/orders`);
    assert.equal(noKey.status, 401);
    const wrongKey = await fetch(`${base}/orders`, { headers: { "X-Ops-Key": "nope" } });
    assert.equal(wrongKey.status, 401);
  } finally {
    server.close();
  }
});

test("address view route requires the ops key", async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/ops/gifts`;
  try {
    const res = await fetch(`${base}/orders/whatever/view-address`, { method: "POST" });
    assert.equal(res.status, 401);
  } finally {
    server.close();
  }
});

test("address view route accepts ops key and returns 404 for unknown order", async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/ops/gifts`;
  try {
    const res = await fetch(`${base}/orders/nonexistent/view-address`, {
      method: "POST",
      headers: { "X-Ops-Key": process.env.GIFT_OPS_KEY, "Content-Type": "application/json" },
    });
    assert.equal(res.status, 404);
  } finally {
    server.close();
  }
});

test.after(async () => {
  await require('../src/config/db').pool.end();
});
