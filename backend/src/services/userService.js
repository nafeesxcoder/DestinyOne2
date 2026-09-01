const crypto = require('crypto');
const { query } = require('../config/db');
async function findUserByPhone(phone) {
  const rows = await query('SELECT * FROM users WHERE phone = ? LIMIT 1', [phone]);
  return rows[0] || null;
}
async function findUserByEmail(email) {
  const rows = await query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  return rows[0] || null;
}
async function findUserById(id) {
  const rows = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}
async function createUser({ phone = null, email = null, fullName = null, avatarUrl = null }) {
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO users (id, phone, email, full_name, avatar_url, phone_verified_at, email_verified_at)
     VALUES (?, ?, ?, ?, ?, ${phone ? 'NOW()' : 'NULL'}, ${email ? 'NOW()' : 'NULL'})`,
    [id, phone, email, fullName, avatarUrl],
  );
  return findUserById(id);
}
async function markPhoneVerified(userId) {
  await query('UPDATE users SET phone_verified_at = NOW() WHERE id = ?', [userId]);
}
async function markEmailVerified(userId) {
  await query('UPDATE users SET email_verified_at = NOW() WHERE id = ?', [userId]);
}
async function findOrCreateByOAuth({ provider, providerUserId, email, fullName, avatarUrl }) {
  const existingLink = await query(
    'SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_user_id = ? LIMIT 1',
    [provider, providerUserId],
  );
  if (existingLink[0]) {
    return findUserById(existingLink[0].user_id);
  }
  let user = email ? await findUserByEmail(email) : null;
  if (!user) {
    user = await createUser({ email, fullName, avatarUrl });
  }
  const linkId = crypto.randomUUID();
  await query(
    'INSERT INTO oauth_accounts (id, user_id, provider, provider_user_id, email) VALUES (?, ?, ?, ?, ?)',
    [linkId, user.id, provider, providerUserId, email],
  );
  return user;
}

// ---------- Soft delete (30-day grace period, Instagram-style) ----------
async function softDeleteUser(userId) {
  await query('UPDATE users SET deleted_at = NOW() WHERE id = ?', [userId]);
}

async function restoreUser(userId) {
  await query('UPDATE users SET deleted_at = NULL WHERE id = ?', [userId]);
}

function isWithinGracePeriod(deletedAt) {
  if (!deletedAt) return false;
  const deletedTime = new Date(deletedAt).getTime();
  const daysSince = (Date.now() - deletedTime) / (1000 * 60 * 60 * 24);
  return daysSince <= 30;
}

// Permanently removes users whose 30-day grace period has expired.
// Foreign keys are ON DELETE CASCADE, so profile/photos/vibes/etc. are removed automatically.
async function purgeExpiredDeletedUsers() {
  const result = await query(
    `DELETE FROM users WHERE deleted_at IS NOT NULL AND deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)`,
  );
  return result.affectedRows || 0;
}

module.exports = {
  findUserByPhone,
  findUserByEmail,
  findUserById,
  createUser,
  markPhoneVerified,
  markEmailVerified,
  findOrCreateByOAuth,
  softDeleteUser,
  restoreUser,
  isWithinGracePeriod,
  purgeExpiredDeletedUsers,
};