const crypto = require("crypto");
const asyncHandler = require("../utils/asyncHandler");
const { ApiError } = require("../middleware/errorHandler");
const otpService = require("../services/otpService");
const userService = require("../services/userService");
const sessionService = require("../services/sessionService");
const oauthService = require("../services/oauthService");
const env = require("../config/env");
const { normalizeIdentifier } = require("../utils/otp");
const {
  normalizeUsername,
  isValidUsername,
  isValidPassword,
  classifyLoginIdentifier,
  hashPassword,
  comparePassword,
} = require("../utils/credentials");
const { signFlowToken, verifyFlowToken } = require("../utils/flowToken");
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
  let accountRestored = false;
  let accountReactivated = false;
  if (!user) {
    user = await userService.createUser(
      channel === "phone" ? { phone: normalized } : { email: normalized },
    );
  } else if (channel === "phone" && !user.phone_verified_at) {
    await userService.markPhoneVerified(user.id);
  } else if (channel === "email" && !user.email_verified_at) {
    await userService.markEmailVerified(user.id);
  }
  // Instagram-style: logging back in within 30 days of deletion restores the account.
  if (user.deleted_at) {
    if (userService.isWithinGracePeriod(user.deleted_at)) {
      await userService.restoreUser(user.id);
      user.deleted_at = null;
      accountRestored = true;
    } else {
      throw new ApiError(410, "This account has been permanently deleted.");
    }
  }
  // Instagram-style: a deactivated account reactivates automatically the moment the member logs back in.
  if (user.deactivated_at) {
    await userService.reactivateUser(user.id);
    user.deactivated_at = null;
    accountReactivated = true;
  }
  const tokens = await sessionService.issueSession(user.id);
  res.json({
    ok: true,
    user: publicUser(user),
    accountRestored,
    accountReactivated,
    ...tokens,
  });
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
// ---------- Delete / restore account (soft delete, 30-day grace period) ----------
const deleteAccount = asyncHandler(async (req, res) => {
  await userService.softDeleteUser(req.user.id);
  await sessionService.revokeAllSessions(req.user.id);
  res.json({
    ok: true,
    message: "Your account is scheduled for permanent deletion in 30 days. Log back in before then to restore it.",
  });
});
// ---------- Deactivate account (Instagram-style, reversible any time by logging back in) ----------
const deactivateAccount = asyncHandler(async (req, res) => {
  await userService.deactivateUser(req.user.id);
  await sessionService.revokeAllSessions(req.user.id);
  res.json({
    ok: true,
    message: "Your account is deactivated. Your profile is hidden until you log back in.",
  });
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
// ---------- Username + password accounts ----------
// Signup: verify a phone or email code, then choose a username and password.
// Login: username, email or phone plus password.
// Forgot password: verify a phone or email code, then set a new password.

const SIGNUP_PURPOSE = "verify";
const RESET_PURPOSE = "reset";

function assertChannel(channel, identifier) {
  if (!channel || !["phone", "email"].includes(channel)) {
    throw new ApiError(400, 'channel must be "phone" or "email"');
  }
  if (!identifier) throw new ApiError(400, "identifier is required");
}

function findByChannel(channel, normalized) {
  return channel === "phone"
    ? userService.findUserByPhone(normalized)
    : userService.findUserByEmail(normalized);
}

// Brings back a deleted (within 30 days) or deactivated account on login.
async function reviveUserIfNeeded(user) {
  let accountRestored = false;
  let accountReactivated = false;
  if (user.deleted_at) {
    if (!userService.isWithinGracePeriod(user.deleted_at)) {
      throw new ApiError(410, "This account has been permanently deleted.");
    }
    await userService.restoreUser(user.id);
    user.deleted_at = null;
    accountRestored = true;
  }
  if (user.deactivated_at) {
    await userService.reactivateUser(user.id);
    user.deactivated_at = null;
    accountReactivated = true;
  }
  return { accountRestored, accountReactivated };
}

const registerRequestCode = asyncHandler(async (req, res) => {
  const { channel, identifier } = req.body;
  assertChannel(channel, identifier);
  const normalized = normalizeIdentifier(channel, identifier);
  const existing = await findByChannel(channel, normalized);
  if (existing && existing.password_hash) {
    throw new ApiError(
      409,
      "An account already exists for this number or email. Log in or reset your password.",
    );
  }
  const result = await otpService.requestOtp({
    channel,
    identifier,
    purpose: SIGNUP_PURPOSE,
  });
  res.json({ ok: true, ...result });
});

const registerVerifyCode = asyncHandler(async (req, res) => {
  const { channel, identifier, code } = req.body;
  assertChannel(channel, identifier);
  if (!code) throw new ApiError(400, "code is required");
  const { identifier: normalized } = await otpService.verifyOtp({
    channel,
    identifier,
    code,
    purpose: SIGNUP_PURPOSE,
  });
  res.json({
    ok: true,
    verificationToken: signFlowToken({ purpose: "register", channel, identifier: normalized }),
  });
});

const usernameAvailable = asyncHandler(async (req, res) => {
  const username = normalizeUsername(req.query.username);
  if (!isValidUsername(username)) {
    return res.json({ ok: true, valid: false, available: false });
  }
  const taken = await userService.findUserByUsername(username);
  res.json({ ok: true, valid: true, available: !taken });
});

const register = asyncHandler(async (req, res) => {
  const { verificationToken, username, password } = req.body;
  if (!verificationToken || !username || !password) {
    throw new ApiError(400, "verificationToken, username and password are required");
  }
  let claims;
  try {
    claims = verifyFlowToken(verificationToken, "register");
  } catch {
    throw new ApiError(401, "Your verification expired. Please request a new code.");
  }
  if (!isValidUsername(username)) {
    throw new ApiError(
      400,
      "Username must be 3-20 letters, numbers, dots or underscores, with at least one letter.",
    );
  }
  if (!isValidPassword(password)) {
    throw new ApiError(400, "Use 10+ characters with uppercase, lowercase, and a number.");
  }
  const handle = normalizeUsername(username);
  if (await userService.findUserByUsername(handle)) {
    throw new ApiError(409, "That username is taken. Try another one.");
  }

  const { channel, identifier } = claims;
  let user = await findByChannel(channel, identifier);
  if (user && user.password_hash) {
    throw new ApiError(409, "An account already exists for this number or email. Log in instead.");
  }

  const passwordHash = await hashPassword(password);
  try {
    if (user) {
      // Accounts made earlier with only a code can add a username and password now.
      await userService.setCredentials(user.id, { username: handle, passwordHash });
      if (channel === "phone" && !user.phone_verified_at) await userService.markPhoneVerified(user.id);
      if (channel === "email" && !user.email_verified_at) await userService.markEmailVerified(user.id);
    } else {
      user = await userService.createUser(channel === "phone" ? { phone: identifier } : { email: identifier });
      await userService.setCredentials(user.id, { username: handle, passwordHash });
    }
  } catch (error) {
    if (error && error.code === "ER_DUP_ENTRY") {
      throw new ApiError(409, "That username is taken. Try another one.");
    }
    throw error;
  }

  user = await userService.findUserById(user.id);
  const revived = await reviveUserIfNeeded(user);
  const tokens = await sessionService.issueSession(user.id);
  res.json({ ok: true, user: publicUser(user), ...revived, ...tokens });
});

const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    throw new ApiError(400, "identifier and password are required");
  }
  const { channel, identifier: key } = classifyLoginIdentifier(identifier);
  const user =
    channel === "phone"
      ? await userService.findUserByPhone(key)
      : channel === "email"
        ? await userService.findUserByEmail(key)
        : await userService.findUserByUsername(key);
  const matches = user && (await comparePassword(password, user.password_hash));
  if (!matches) {
    throw new ApiError(401, "Wrong username, email, phone or password.");
  }
  const revived = await reviveUserIfNeeded(user);
  const tokens = await sessionService.issueSession(user.id);
  res.json({ ok: true, user: publicUser(user), ...revived, ...tokens });
});

const passwordRequestCode = asyncHandler(async (req, res) => {
  const { channel, identifier } = req.body;
  assertChannel(channel, identifier);
  const normalized = normalizeIdentifier(channel, identifier);
  // Same answer whether or not the account exists, so this cannot be used to find members.
  const user = await findByChannel(channel, normalized);
  if (user) {
    await otpService.requestOtp({ channel, identifier, purpose: RESET_PURPOSE });
  }
  res.json({ ok: true, identifier: normalized, expiresInSeconds: env.otp.expiresMinutes * 60 });
});

const passwordVerifyCode = asyncHandler(async (req, res) => {
  const { channel, identifier, code } = req.body;
  assertChannel(channel, identifier);
  if (!code) throw new ApiError(400, "code is required");
  const { identifier: normalized } = await otpService.verifyOtp({
    channel,
    identifier,
    code,
    purpose: RESET_PURPOSE,
  });
  const user = await findByChannel(channel, normalized);
  res.json({
    ok: true,
    // Accounts made with only a code have no username yet; the reset asks for one.
    needsUsername: !user || !user.username,
    resetToken: signFlowToken({ purpose: "reset", channel, identifier: normalized }),
  });
});

const passwordReset = asyncHandler(async (req, res) => {
  const { resetToken, password, username } = req.body;
  if (!resetToken || !password) {
    throw new ApiError(400, "resetToken and password are required");
  }
  let claims;
  try {
    claims = verifyFlowToken(resetToken, "reset");
  } catch {
    throw new ApiError(401, "This reset expired. Please request a new code.");
  }
  if (!isValidPassword(password)) {
    throw new ApiError(400, "Use 10+ characters with uppercase, lowercase, and a number.");
  }
  const user = await findByChannel(claims.channel, claims.identifier);
  if (!user) throw new ApiError(400, "This reset is no longer valid. Please start again.");
  const passwordHash = await hashPassword(password);
  if (!user.username) {
    // Code-only accounts need a username so they can log in with username and password.
    if (!username || !isValidUsername(username)) {
      throw new ApiError(
        400,
        "Choose a username: 3-20 letters, numbers, dots or underscores, with at least one letter.",
      );
    }
    const handle = normalizeUsername(username);
    if (await userService.findUserByUsername(handle)) {
      throw new ApiError(409, "That username is taken. Try another one.");
    }
    try {
      await userService.setCredentials(user.id, { username: handle, passwordHash });
    } catch (error) {
      if (error && error.code === "ER_DUP_ENTRY") {
        throw new ApiError(409, "That username is taken. Try another one.");
      }
      throw error;
    }
  } else {
    await userService.setPassword(user.id, passwordHash);
  }
  // A new password signs out every other device.
  await sessionService.revokeAllSessions(user.id);
  res.json({ ok: true, message: "Password updated. Log in with your new password." });
});

// ---------- helpers ----------
function publicUser(user) {
  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    username: user.username || null,
    hasPassword: !!user.password_hash,
    fullName: user.full_name,
    avatarUrl: user.avatar_url,
    phoneVerified: !!user.phone_verified_at,
    emailVerified: !!user.email_verified_at,
  };
}
module.exports = {
  requestOtp,
  verifyOtp,
  registerRequestCode,
  registerVerifyCode,
  usernameAvailable,
  register,
  login,
  passwordRequestCode,
  passwordVerifyCode,
  passwordReset,
  refresh,
  logout,
  me,
  deleteAccount,
  deactivateAccount,
  googleStart,
  googleCallback,
  appleStart,
  appleCallback,
  linkedinStart,
  linkedinCallback,
};
