const crypto = require('crypto');
const { query } = require('../config/db');

const REQUEST_TTL_DAYS = 7;

function toPartnerRow(profileRow, userId) {
  return {
    member_id: userId,
    display_name: profileRow?.first_name || 'Member',
    city: profileRow?.city || '',
    profession: profileRow?.profession || '',
    verified: !!profileRow?.verified,
  };
}

async function findActiveConnection(userId) {
  const rows = await query(
    `SELECT * FROM couple_connections
     WHERE (requester_id = ? OR partner_id = ?) AND status = 'active'
     ORDER BY updated_at DESC LIMIT 1`,
    [userId, userId],
  );
  return rows[0] || null;
}

async function searchByPhone(phone, selfUserId) {
  const users = await query(
    'SELECT id FROM users WHERE phone = ? AND id != ? LIMIT 1',
    [phone, selfUserId],
  );
  if (!users.length) return null;
  const targetId = users[0].id;
  const [profile] = await query('SELECT * FROM profiles WHERE user_id = ?', [targetId]);
  return toPartnerRow(profile, targetId);
}

async function createRequest(requesterId, targetId) {
  if (requesterId === targetId) {
    const err = new Error('You cannot send a couple request to yourself.');
    err.status = 400;
    throw err;
  }
  const existingActive = await findActiveConnection(requesterId);
  if (existingActive) {
    const err = new Error('You are already connected to a partner.');
    err.status = 409;
    throw err;
  }
  const pending = await query(
    `SELECT id FROM couple_requests
     WHERE requester_id = ? AND target_id = ? AND status = 'pending' AND expires_at > NOW(6)`,
    [requesterId, targetId],
  );
  if (pending.length) {
    const err = new Error('A request to this member is already pending.');
    err.status = 409;
    throw err;
  }
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO couple_requests (id, requester_id, target_id, status, expires_at)
     VALUES (?, ?, ?, 'pending', DATE_ADD(NOW(6), INTERVAL ${REQUEST_TTL_DAYS} DAY))`,
    [id, requesterId, targetId],
  );
  const [row] = await query('SELECT * FROM couple_requests WHERE id = ?', [id]);
  const [targetProfile] = await query('SELECT * FROM profiles WHERE user_id = ?', [targetId]);
  return {
    request_id: row.id,
    member: toPartnerRow(targetProfile, targetId),
    status: row.status,
    created_at: row.created_at,
    expires_at: row.expires_at,
  };
}

async function respondToRequest(userId, requestId, accept) {
  const rows = await query(
    `SELECT * FROM couple_requests WHERE id = ? AND target_id = ? AND status = 'pending' AND expires_at > NOW(6)`,
    [requestId, userId],
  );
  if (!rows.length) {
    const err = new Error('This request is no longer available.');
    err.status = 404;
    throw err;
  }
  const request = rows[0];
  if (!accept) {
    await query(`UPDATE couple_requests SET status = 'declined' WHERE id = ?`, [requestId]);
    return getHub(userId);
  }
  await query(`UPDATE couple_requests SET status = 'accepted' WHERE id = ?`, [requestId]);
  const connectionId = crypto.randomUUID();
  await query(
    `INSERT INTO couple_connections (id, requester_id, partner_id, status)
     VALUES (?, ?, ?, 'active')`,
    [connectionId, request.requester_id, userId],
  );
  await query(
    `INSERT INTO experience_mode (user_id, mode) VALUES (?, 'couple')
     ON DUPLICATE KEY UPDATE mode = 'couple'`,
    [userId],
  );
  await query(
    `INSERT INTO experience_mode (user_id, mode) VALUES (?, 'couple')
     ON DUPLICATE KEY UPDATE mode = 'couple'`,
    [request.requester_id],
  );
  await query(
    `UPDATE couple_requests SET status = 'cancelled'
     WHERE status = 'pending' AND id != ? AND (requester_id IN (?, ?) OR target_id IN (?, ?))`,
    [requestId, userId, request.requester_id, userId, request.requester_id],
  );
  return getHub(userId);
}

async function getHub(userId) {
  const [modeRow] = await query('SELECT mode FROM experience_mode WHERE user_id = ?', [userId]);
  const experienceMode = modeRow?.mode || 'seeking';

  const active = await findActiveConnection(userId);
  let connection = null;
  if (active) {
    const partnerId = active.requester_id === userId ? active.partner_id : active.requester_id;
    const [partnerProfile] = await query('SELECT * FROM profiles WHERE user_id = ?', [partnerId]);
    connection = {
      connection_id: active.id,
      partner_member_id: partnerId,
      partner_display_name: partnerProfile?.first_name || 'Your partner',
    };
  }

  const incoming = await query(
    `SELECT * FROM couple_requests WHERE target_id = ? AND status = 'pending' AND expires_at > NOW(6)
     ORDER BY created_at DESC`,
    [userId],
  );
  const outgoing = await query(
    `SELECT * FROM couple_requests WHERE requester_id = ? AND status = 'pending' AND expires_at > NOW(6)
     ORDER BY created_at DESC`,
    [userId],
  );

  const hydrateRequests = async (rows, otherIdField) => {
    const results = [];
    for (const row of rows) {
      const otherId = row[otherIdField];
      const [profile] = await query('SELECT * FROM profiles WHERE user_id = ?', [otherId]);
      results.push({
        request_id: row.id,
        member: toPartnerRow(profile, otherId),
        status: row.status,
        created_at: row.created_at,
        expires_at: row.expires_at,
      });
    }
    return results;
  };

  return {
    experience_mode: connection ? 'couple' : experienceMode,
    connection,
    incoming_requests: await hydrateRequests(incoming, 'requester_id'),
    outgoing_requests: await hydrateRequests(outgoing, 'target_id'),
  };
}

async function setMode(userId, enabled) {
  await query(
    `INSERT INTO experience_mode (user_id, mode) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE mode = VALUES(mode)`,
    [userId, enabled ? 'couple' : 'seeking'],
  );
}

module.exports = {
  searchByPhone,
  createRequest,
  respondToRequest,
  getHub,
  setMode,
};