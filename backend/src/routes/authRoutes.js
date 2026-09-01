const express = require("express");
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");
const router = express.Router();
const otpRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});
const otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});
// OTP: phone or email login
router.post("/otp/request", otpRequestLimiter, authController.requestOtp);
router.post("/otp/verify", otpVerifyLimiter, authController.verifyOtp);
// Session
router.post("/refresh", authController.refresh);
router.post("/logout", requireAuth, authController.logout);
router.get("/me", requireAuth, authController.me);
router.delete("/account", requireAuth, authController.deleteAccount);
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