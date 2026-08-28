const crypto = require("crypto");
const { query } = require("../config/db");
const env = require("../config/env");
const {
  generateNumericCode,
  hashCode,
  compareCode,
  normalizeIdentifier,
} = require("../utils/otp");
const { sendOtpSms } = require("./smsService");
const { sendOtpEmail } = require("./emailService");
const { ApiError } = require("../middleware/errorHandler");

async function requestOtp({ channel, identifier }) {
  const normalized = normalizeIdentifier(channel, identifier);

  // Cooldown: block rapid resends for the same identifier
  const recent = await query(
    `SELECT created_at FROM otp_codes
     WHERE identifier = ? AND channel = ? AND consumed_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [normalized, channel],
  );
  if (recent[0]) {
    const secondsSince =
      (Date.now() - new Date(recent[0].created_at).getTime()) / 1000;
    if (secondsSince < env.otp.resendCooldownSeconds) {
      throw new ApiError(
        429,
        `Please wait ${Math.ceil(env.otp.resendCooldownSeconds - secondsSince)}s before requesting another code`,
      );
    }
  }

  const code = generateNumericCode();
  const codeHash = await hashCode(code);
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + env.otp.expiresMinutes * 60 * 1000);

  await query(
    `INSERT INTO otp_codes (id, identifier, channel, code_hash, purpose, max_attempts, expires_at)
     VALUES (?, ?, ?, ?, 'login', ?, ?)`,
    [id, normalized, channel, codeHash, env.otp.maxAttempts, expiresAt],
  );

  if (channel === "phone") {
    await sendOtpSms(normalized, code);
  } else {
    await sendOtpEmail(normalized, code);
  }

  return {
    identifier: normalized,
    expiresInSeconds: env.otp.expiresMinutes * 60,
  };
}

async function verifyOtp({ channel, identifier, code }) {
  const normalized = normalizeIdentifier(channel, identifier);

  // Phone aur email dono ke liye database se hi check karo
  // (kyunki OTP humesha yahin generate/save hota hai, chahe SMS ho ya email)
  const rows = await query(
    `SELECT * FROM otp_codes
     WHERE identifier = ? AND channel = ? AND consumed_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [normalized, channel],
  );
  const record = rows[0];

  if (!record) {
    throw new ApiError(400, "No active code found. Please request a new one.");
  }
  if (new Date(record.expires_at).getTime() < Date.now()) {
    throw new ApiError(400, "This code has expired. Please request a new one.");
  }
  if (record.attempts >= record.max_attempts) {
    throw new ApiError(
      429,
      "Too many incorrect attempts. Please request a new code.",
    );
  }

  const isMatch = await compareCode(code, record.code_hash);
  if (!isMatch) {
    await query("UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?", [
      record.id,
    ]);
    throw new ApiError(400, "Incorrect code. Please try again.");
  }

  await query("UPDATE otp_codes SET consumed_at = NOW() WHERE id = ?", [
    record.id,
  ]);

  return { identifier: normalized };
}

module.exports = { requestOtp, verifyOtp };
