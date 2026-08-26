const express = require("express");
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

// OTP: phone or email login
router.post("/otp/request", otpLimiter, authController.requestOtp);
router.post("/otp/verify", otpLimiter, authController.verifyOtp);

// Session
router.post("/refresh", authController.refresh);
router.post("/logout", requireAuth, authController.logout);
router.get("/me", requireAuth, authController.me);

// Google
router.get("/google", authController.googleStart);
router.get("/google/callback", authController.googleCallback);

// Apple
router.get("/apple", authController.appleStart);
router.post("/apple/callback", authController.appleCallback);

// LinkedIn
router.get("/linkedin", authController.linkedinStart);
router.get("/linkedin/callback", authController.linkedinCallback);

module.exports = router;
