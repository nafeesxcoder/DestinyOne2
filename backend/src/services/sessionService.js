const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const env = require('../config/env');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');

function msFromExpiresIn(expiresIn) {
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!match) return 30 * 24 * 60 * 60 * 1000; // default 30 days
  const value = Number(match[1]);
  const unit = match[2];
  const unitMs = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * unitMs[unit];
}

async function issueSession(userId) {
  const accessToken = signAccessToken({ sub: userId });
  const refreshToken = signRefreshToken({ sub: userId });

  const tokenHash = await bcrypt.hash(refreshToken, 10);
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + msFromExpiresIn(env.jwt.refreshExpiresIn));

  await query(
    'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
    [id, userId, tokenHash, expiresAt],
  );

  return { accessToken, refreshToken };
}

async function rotateSession(oldRefreshToken) {
  let payload;
  try {
    payload = verifyRefreshToken(oldRefreshToken);
  } catch {
    const err = new Error('Invalid or expired refresh token');
    err.statusCode = 401;
    throw err;
  }

  const candidates = await query(
    'SELECT * FROM refresh_tokens WHERE user_id = ? AND revoked_at IS NULL AND expires_at > NOW()',
    [payload.sub],
  );

  let matched = null;
  for (const candidate of candidates) {
    // eslint-disable-next-line no-await-in-loop
    if (await bcrypt.compare(oldRefreshToken, candidate.token_hash)) {
      matched = candidate;
      break;
    }
  }

  if (!matched) {
    const err = new Error('Refresh token not recognized or already used');
    err.statusCode = 401;
    throw err;
  }

  await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?', [matched.id]);

  return issueSession(payload.sub);
}

async function revokeAllSessions(userId) {
  await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL', [userId]);
}

module.exports = { issueSession, rotateSession, revokeAllSessions };
