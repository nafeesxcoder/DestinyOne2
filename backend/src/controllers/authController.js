const crypto = require("crypto");
const asyncHandler = require("../utils/asyncHandler");
const { ApiError } = require("../middleware/errorHandler");
const otpService = require("../services/otpService");
const userService = require("../services/userService");
const sessionService = require("../services/sessionService");
const oauthService = require("../services/oauthService");
const env = require("../config/env");

// In-memory OAuth state store (swap for Redis in production / multi-instance deploys)
const oauthStates = new Map();
function createState(meta = {}) {
  const state = crypto.randomUUID();
  oauthStates.set(state, { ...meta, createdAt: Date.now() });
  return state;
}
function consumeState(state) {
  const value = oauthStates.get(state);
  oauthStates.delete(state);
  return value;
}

// ---------- OTP: phone or email ----------
const requestOtp = asyncHandler(async (req, res) => {
  const { channel, identifier } = req.body;
  if (!channel || !["phone", "email"].includes(channel)) {
    throw new ApiError(400, 'channel must be "phone" or "email"');
  }
  if (!identifier) {
    throw new ApiError(400, "identifier is required");
  }

  const result = await otpService.requestOtp({ channel, identifier });
  res.json({ ok: true, ...result });
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { channel, identifier, code } = req.body;
  if (!channel || !["phone", "email"].includes(channel)) {
    throw new ApiError(400, 'channel must be "phone" or "email"');
  }
  if (!identifier || !code) {
    throw new ApiError(400, "identifier and code are required");
  }

  const { identifier: normalized } = await otpService.verifyOtp({
    channel,
    identifier,
    code,
  });

  let user =
    channel === "phone"
      ? await userService.findUserByPhone(normalized)
      : await userService.findUserByEmail(normalized);

  if (!user) {
    user = await userService.createUser(
      channel === "phone" ? { phone: normalized } : { email: normalized },
    );
  } else if (channel === "phone" && !user.phone_verified_at) {
    await userService.markPhoneVerified(user.id);
  } else if (channel === "email" && !user.email_verified_at) {
    await userService.markEmailVerified(user.id);
  }

  const tokens = await sessionService.issueSession(user.id);
  res.json({ ok: true, user: publicUser(user), ...tokens });
});

// ---------- Refresh / logout ----------
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new ApiError(400, "refreshToken is required");
  const tokens = await sessionService.rotateSession(refreshToken);
  res.json({ ok: true, ...tokens });
});

const logout = asyncHandler(async (req, res) => {
  await sessionService.revokeAllSessions(req.user.id);
  res.json({ ok: true });
});

const me = asyncHandler(async (req, res) => {
  const user = await userService.findUserById(req.user.id);
  if (!user) throw new ApiError(404, "User not found");
  res.json({ ok: true, user: publicUser(user) });
});

// ---------- Google ----------
const googleStart = asyncHandler(async (req, res) => {
  const state = createState();
  res.redirect(oauthService.getGoogleAuthUrl(state));
});

const googleCallback = asyncHandler(async (req, res) => {
  const { code, state } = req.query;
  consumeState(state);
  const profile = await oauthService.exchangeGoogleCode(code);
  if (!profile.email) {
    return res.redirect(`${env.appUrl}/auth/callback?error=google_no_email`);
  }
  // Google email already verified hai, extra security ke liye OTP bhi bhejte hain
  await otpService.requestOtp({ channel: "email", identifier: profile.email });
  const params = new URLSearchParams({
    provider: "google",
    email: profile.email,
    fullName: profile.fullName || "",
  });
  res.redirect(`${env.appUrl}/auth/callback?${params.toString()}`);
});

// ---------- Apple ----------
const appleStart = asyncHandler(async (req, res) => {
  const state = createState();
  res.redirect(oauthService.getAppleAuthUrl(state));
});

const appleCallback = asyncHandler(async (req, res) => {
  // Apple posts form data (response_mode=form_post)
  const { code, state } = req.body;
  consumeState(state);
  const profile = await oauthService.exchangeAppleCode(code);
  if (!profile.email) {
    return res.redirect(`${env.appUrl}/auth/callback?error=apple_no_email`);
  }
  await otpService.requestOtp({ channel: "email", identifier: profile.email });
  const params = new URLSearchParams({
    provider: "apple",
    email: profile.email,
    fullName: profile.fullName || "",
  });
  res.redirect(`${env.appUrl}/auth/callback?${params.toString()}`);
});

// ---------- LinkedIn ----------
const linkedinStart = asyncHandler(async (req, res) => {
  const state = createState();
  res.redirect(oauthService.getLinkedInAuthUrl(state));
});

const linkedinCallback = asyncHandler(async (req, res) => {
  const { code, state } = req.query;
  consumeState(state);
  const profile = await oauthService.exchangeLinkedInCode(code);
  if (!profile.email) {
    return res.redirect(`${env.appUrl}/auth/callback?error=linkedin_no_email`);
  }
  await otpService.requestOtp({ channel: "email", identifier: profile.email });
  const params = new URLSearchParams({
    provider: "linkedin",
    email: profile.email,
    fullName: profile.fullName || "",
  });
  res.redirect(`${env.appUrl}/auth/callback?${params.toString()}`);
});

// ---------- helpers ----------
function publicUser(user) {
  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    fullName: user.full_name,
    avatarUrl: user.avatar_url,
    phoneVerified: !!user.phone_verified_at,
    emailVerified: !!user.email_verified_at,
  };
}

module.exports = {
  requestOtp,
  verifyOtp,
  refresh,
  logout,
  me,
  googleStart,
  googleCallback,
  appleStart,
  appleCallback,
  linkedinStart,
  linkedinCallback,
};
