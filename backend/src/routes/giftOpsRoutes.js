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
  // SECURITY: CSP limits what the console page can load (no third-party scripts/styles).
  res.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  );
  res.set("X-Frame-Options", "DENY");
  res.set("Referrer-Policy", "no-referrer");
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

// SECURITY: called by the console when ops clicks "Show address". Records who viewed it.
router.post("/orders/:orderId/view-address", wrap(async (req) => {
  return giftService.opsLogAddressView(req.params.orderId, "ops");
}));

module.exports = router;
