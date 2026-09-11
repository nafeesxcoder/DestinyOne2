const crypto = require('crypto');
const { query } = require('../config/db');

async function assertParticipant(conversationId, userId) {
  const mutual = await query(
    `SELECT user_a_id, user_b_id FROM mutual_matches
     WHERE (user_a_id = ? AND user_b_id = ?) OR (user_a_id = ? AND user_b_id = ?)`,
    [userId, conversationId, conversationId, userId],
  );
  if (mutual.length) return [mutual[0].user_a_id, mutual[0].user_b_id];

  const couple = await query(
    `SELECT requester_id, partner_id FROM couple_connections
     WHERE id = ? AND status = 'active' AND (requester_id = ? OR partner_id = ?)`,
    [conversationId, userId, userId],
  );
  if (couple.length) return [couple[0].requester_id, couple[0].partner_id];

  const err = new Error('You do not have access to this conversation.');
  err.status = 403;
  throw err;
}

function rowToMessage(row, viewerId) {
  const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
  return {
    ...payload,
    id: row.id,
    senderId: row.sender_id,
    mine: row.sender_id === viewerId,
    status: row.status,
    createdAt: Number(row.created_at_ms),
  };
}

async function listMessages(conversationId, userId, sinceMs) {
  await assertParticipant(conversationId, userId);
  const rows = sinceMs
    ? await query(
        `SELECT * FROM chat_messages WHERE conversation_id = ? AND created_at_ms > ?
         ORDER BY created_at_ms ASC`,
        [conversationId, sinceMs],
      )
    : await query(
        `SELECT * FROM chat_messages WHERE conversation_id = ?
         ORDER BY created_at_ms ASC`,
        [conversationId],
      );
  return rows.map((row) => rowToMessage(row, userId));
}

async function sendMessage(conversationId, userId, message) {
  await assertParticipant(conversationId, userId);
  const id = String(message.id || crypto.randomUUID());
  const createdAtMs = Number(message.createdAt) || Date.now();
  const { id: _id, senderId: _senderId, mine: _mine, status: _status, createdAt: _createdAt, ...payload } = message;
  await query(
    `INSERT INTO chat_messages (id, conversation_id, sender_id, message_type, payload, status, created_at_ms)
     VALUES (?, ?, ?, ?, ?, 'sent', ?)
     ON DUPLICATE KEY UPDATE payload = VALUES(payload)`,
    [id, conversationId, userId, message.type || 'text', JSON.stringify(payload), createdAtMs],
  );
  const [row] = await query(
    `SELECT * FROM chat_messages WHERE id = ? AND conversation_id = ?`,
    [id, conversationId],
  );
  return rowToMessage(row, userId);
}

async function createDateProposal(conversationId, userId, date) {
  await assertParticipant(conversationId, userId);
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO date_proposals (id, conversation_id, proposer_id, status, venue, category, area, time_label)
     VALUES (?, ?, ?, 'proposed', ?, ?, ?, ?)`,
    [id, conversationId, userId, date?.venue || null, date?.category || null, date?.area || null, date?.time || null],
  );
  return { id, status: 'proposed' };
}

async function updateDatePlanStatus(userId, proposalId, status) {
  if (!proposalId) {
    const err = new Error('proposalId is required');
    err.status = 400;
    throw err;
  }
  const rows = await query('SELECT * FROM date_proposals WHERE id = ?', [proposalId]);
  if (!rows.length) {
    const err = new Error('Date proposal not found');
    err.status = 404;
    throw err;
  }
  await assertParticipant(rows[0].conversation_id, userId);
  await query('UPDATE date_proposals SET status = ? WHERE id = ?', [status, proposalId]);
  return { id: proposalId, status };
}

async function shareLiveLocation(conversationId, userId, location, clientActionId) {
  await assertParticipant(conversationId, userId);
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO live_locations (id, conversation_id, sharer_id, client_action_id, latitude, longitude, label, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude)`,
    [
      id,
      conversationId,
      userId,
      clientActionId,
      location?.latitude ?? null,
      location?.longitude ?? null,
      location?.label || null,
      location?.expiresAt ? new Date(location.expiresAt) : null,
    ],
  );
  return { ok: true };
}

module.exports = {
  assertParticipant,
  listMessages,
  sendMessage,
  createDateProposal,
  updateDatePlanStatus,
  shareLiveLocation,
};