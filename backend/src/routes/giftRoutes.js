const express = require("express");
const rateLimit = require("express-rate-limit");
const giftController = require("../controllers/giftController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// SECURITY: the gifts API touches money and personal addresses, so every
// authenticated caller is rate limited. The per-user limiters run after
// requireAuth (they key on req.user.id); the IP limiter guards the door.

// Coarse per-IP cap for the whole router (spam / accidental loops).
router.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

router.use(requireAuth);

// Per-user throttle for creating orders (real gift limits live in giftService).
const createOrderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `gift-create:${req.user?.id || req.ip}`,
  message: { error: "Too many gift orders. Please try again later." },
});

// Per-user throttle for Stripe checkout attempts.
const checkoutLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `gift-checkout:${req.user?.id || req.ip}`,
  message: { error: "Too many checkout attempts. Please try again later." },
});

router.post("/orders", createOrderLimiter, giftController.createOrder);
router.post("/orders/:orderId/respond", giftController.respond);
router.post("/orders/:orderId/checkout", checkoutLimiter, giftController.checkout);
router.get("/orders/:orderId/confirm", giftController.confirm);
router.get("/orders/:orderId", giftController.getOrder);

module.exports = router;
