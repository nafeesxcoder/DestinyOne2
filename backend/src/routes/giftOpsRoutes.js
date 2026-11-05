const path = require("path");
const express = require("express");
const rateLimit = require("express-rate-limit");
const asyncHandler = require("../utils/asyncHandler");
const { ApiError } = require("../middleware/errorHandler");
const { requireOpsKey } = require("../middleware/opsAuth");
const giftService = require("../services/giftService");

const router = express.Router();
router.use(rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false }));

// The console page itself holds no data and no secrets: it asks for the ops key in
// the browser and sends it with every request, so it is served before the key check.
router.get("/console", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "..", "ops", "giftConsole.html"));
});

router.use(requireOpsKey);

const wrap = (fn) =>
  asyncHandler(async (req, res) => {
    try {
      res.json({ ok: true, ...(await fn(req)) });
    } catch (error) {
      throw new ApiError(error.status || 500, error.message || "Ops request failed");
    }
  });

// GET /ops/gifts/orders?status=merchant_preparing  -> what still has to be delivered
router.get("/orders", wrap(async (req) => ({ orders: await giftService.opsListOrders(req.query.status) })));
router.get("/orders/:orderId", wrap(async (req) => ({ order: await giftService.opsGetOrder(req.params.orderId) })));
// POST /ops/gifts/orders/:id/status {status, trackingUrl?, provider?, providerOrderId?, reason?, note?}
router.post("/orders/:orderId/status", wrap(async (req) => ({ order: await giftService.opsAdvanceOrder(req.params.orderId, req.body) })));

module.exports = router;
