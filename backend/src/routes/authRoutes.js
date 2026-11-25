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
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
});

// OTP: phone or email login (legacy)
router.post("/otp/request", otpRequestLimiter, authController.requestOtp);
router.post("/otp/verify", otpVerifyLimiter, authController.verifyOtp);

// Signup: verify phone or email, then choose username and password
router.post("/register/request-code", otpRequestLimiter, authController.registerRequestCode);
router.post("/register/verify-code", otpVerifyLimiter, authController.registerVerifyCode);
router.post("/register", otpVerifyLimiter, authController.register);
router.get("/username/available", authController.usernameAvailable);

// Login with username, email or phone, plus password
router.post("/login", loginLimiter, authController.login);

// Forgot password: code to phone or email, then a new password
router.post("/password/request-code", otpRequestLimiter, authController.passwordRequestCode);
router.post("/password/verify-code", otpVerifyLimiter, authController.passwordVerifyCode);
router.post("/password/reset", otpVerifyLimiter, authController.passwordReset);
// Session
router.post("/refresh", authController.refresh);
router.post("/logout", requireAuth, authController.logout);
router.get("/me", requireAuth, authController.me);
router.delete("/account", requireAuth, authController.deleteAccount);
router.post("/deactivate", requireAuth, authController.deactivateAccount);
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
