const crypto = require("crypto");
const { query } = require("../config/db");
const pushService = require("./pushService");

async function assertParticipant(conversationId, userId) {
  const mutual = await query(
    `SELECT user_a_id, user_b_id FROM mutual_matches
     WHERE (user_a_id = ? AND user_b_id = ?) OR (user_a_id = ? AND user_b_id = ?)`,
    [userId, conversationId, conversationId, userId],
  );
  let participants = null;
  if (mutual.length) participants = [mutual[0].user_a_id, mutual[0].user_b_id];

  if (!participants) {
    const couple = await query(
      `SELECT requester_id, partner_id FROM couple_connections
       WHERE id = ? AND status = 'active' AND (requester_id = ? OR partner_id = ?)`,
      [conversationId, userId, userId],
    );
    if (couple.length)
      participants = [couple[0].requester_id, couple[0].partner_id];
  }

  if (!participants) {
    const err = new Error("You do not have access to this conversation.");
    err.status = 403;
    throw err;
  }

  const other = participants.find((id) => id !== userId) || conversationId;
  const blocked = await query(
    `SELECT id FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)`,
    [userId, other, other, userId],
  );
  if (blocked.length) {
    const err = new Error("This conversation is not available.");
    err.status = 403;
    throw err;
  }

  return participants;
}

function parseJsonColumn(value, fallback) {
  if (value === null || value === undefined) return fallback;
  return typeof value === "string" ? JSON.parse(value) : value;
}

function rowToMessage(row, viewerId) {
  const payload = parseJsonColumn(row.payload, {});
  const starredBy = parseJsonColumn(row.starred_by, []);
  const hiddenBy = parseJsonColumn(row.hidden_by, []);
  const reactionsMap = parseJsonColumn(row.reactions, {});
  return {
    ...payload,
    id: row.id,
    senderId: row.sender_id,
    mine: row.sender_id === viewerId,
    status: row.status,
    createdAt: Number(row.created_at_ms),
    starredByMe: starredBy.includes(viewerId),
    hiddenForMe: hiddenBy.includes(viewerId),
    pinnedAt: row.pinned_at ? new Date(row.pinned_at).getTime() : undefined,
    reactions: reactionsMap[viewerId]
      ? { me: reactionsMap[viewerId] }
      : undefined,
    editedAt: row.edited_at
      ? new Date(row.edited_at).getTime()
      : payload.editedAt,
    deletedAt: row.deleted_at ? new Date(row.deleted_at).getTime() : undefined,
    deletedForEveryone: !!row.deleted_for_everyone,
  };
}

async function getOwnedMessage(conversationId, userId, messageId) {
  await assertParticipant(conversationId, userId);
  const rows = await query(
    "SELECT * FROM chat_messages WHERE id = ? AND conversation_id = ?",
    [messageId, conversationId],
  );
  if (!rows.length) {
    const err = new Error("Message not found");
    err.status = 404;
    throw err;
  }
  return rows[0];
}

async function editMessage(conversationId, userId, messageId, text) {
  const row = await getOwnedMessage(conversationId, userId, messageId);
  if (row.sender_id !== userId) {
    const err = new Error("You can only edit your own messages.");
    err.status = 403;
    throw err;
  }
  if (row.deleted_at) {
    const err = new Error("This message has been deleted.");
    err.status = 400;
    throw err;
  }
  const payload = parseJsonColumn(row.payload, {});
  payload.text = text;
  await query(
    "UPDATE chat_messages SET payload = ?, edited_at = NOW(6), updated_at_ms = ? WHERE id = ? AND conversation_id = ?",
    [JSON.stringify(payload), Date.now(), messageId, conversationId],
  );
  const [updated] = await query(
    "SELECT * FROM chat_messages WHERE id = ? AND conversation_id = ?",
    [messageId, conversationId],
  );
  return rowToMessage(updated, userId);
}

const CLEARED_PAYLOAD = {
  text: undefined,
  uri: undefined,
  gift: undefined,
  snap: undefined,
  sticker: undefined,
  voice: undefined,
  document: undefined,
  location: undefined,
  date: undefined,
  linkPreview: undefined,
};

async function softDeleteMessages(conversationId, ids) {
  if (!ids.length) return;
  await query(
    `UPDATE chat_messages SET payload = ?, deleted_at = NOW(6), deleted_for_everyone = 1, updated_at_ms = ?
     WHERE conversation_id = ? AND id IN (${ids.map(() => "?").join(",")})`,
    [JSON.stringify(CLEARED_PAYLOAD), Date.now(), conversationId, ...ids],
  );
}

async function deleteMessage(conversationId, userId, messageId) {
  const row = await getOwnedMessage(conversationId, userId, messageId);
  if (row.sender_id !== userId) {
    const err = new Error("You can only delete your own messages.");
    err.status = 403;
    throw err;
  }
  await softDeleteMessages(conversationId, [messageId]);
  const [updated] = await query(
    "SELECT * FROM chat_messages WHERE id = ? AND conversation_id = ?",
    [messageId, conversationId],
  );
  return rowToMessage(updated, userId);
}

async function setMessageState(conversationId, userId, messageId, input) {
  const row = await getOwnedMessage(conversationId, userId, messageId);
  let starredBy = parseJsonColumn(row.starred_by, []);
  if (typeof input.starred === "boolean") {
    starredBy = input.starred
      ? [...new Set([...starredBy, userId])]
      : starredBy.filter((id) => id !== userId);
  }
  let hiddenBy = parseJsonColumn(row.hidden_by, []);
  if (typeof input.hidden === "boolean") {
    hiddenBy = input.hidden
      ? [...new Set([...hiddenBy, userId])]
      : hiddenBy.filter((id) => id !== userId);
  }
  let pinnedAt = row.pinned_at;
  if (typeof input.pinned === "boolean") {
    pinnedAt = input.pinned ? new Date() : null;
  }
  const reactionsMap = parseJsonColumn(row.reactions, {});
  if (input.reaction !== undefined) {
    if (input.reaction) reactionsMap[userId] = input.reaction;
    else delete reactionsMap[userId];
  }
  await query(
    "UPDATE chat_messages SET starred_by = ?, hidden_by = ?, pinned_at = ?, reactions = ?, updated_at_ms = ? WHERE id = ? AND conversation_id = ?",
    [
      JSON.stringify(starredBy),
      JSON.stringify(hiddenBy),
      pinnedAt,
      JSON.stringify(reactionsMap),
      Date.now(),
      messageId,
      conversationId,
    ],
  );
  return { ok: true };
}

async function getRetentionMode(conversationId, userId) {
  const rows = await query(
    "SELECT settings FROM chat_conversation_settings WHERE conversation_id = ? AND user_id = ?",
    [conversationId, userId],
  );
  if (!rows.length) return "keep";
  const settings = parseJsonColumn(rows[0].settings, {});
  return settings.retentionMode || "keep";
}

async function listMessages(conversationId, userId, sinceMs) {
  await assertParticipant(conversationId, userId);
  const expired = await query(
    `SELECT id FROM chat_messages WHERE conversation_id = ? AND expires_at IS NOT NULL
     AND expires_at <= NOW(6) AND deleted_for_everyone = 0`,
    [conversationId],
  );
  await softDeleteMessages(
    conversationId,
    expired.map((row) => row.id),
  );
  const rows = sinceMs
    ? await query(
        `SELECT * FROM chat_messages WHERE conversation_id = ? AND updated_at_ms > ?
         ORDER BY created_at_ms ASC`,
        [conversationId, sinceMs],
      )
    : await query(
        `SELECT * FROM chat_messages WHERE conversation_id = ?
         ORDER BY created_at_ms ASC`,
        [conversationId],
      );
  const toMarkRead = rows.filter(
    (row) =>
      row.sender_id !== userId && row.status !== "read" && !row.deleted_for_everyone,
  );
  if (toMarkRead.length) {
    const readIds = toMarkRead.map((row) => row.id);
    await query(
      `UPDATE chat_messages SET status = 'read', updated_at_ms = ?
       WHERE conversation_id = ? AND id IN (${readIds.map(() => "?").join(",")})`,
      [Date.now(), conversationId, ...readIds],
    );
    toMarkRead.forEach((row) => {
      row.status = "read";
    });
  }
  const messages = rows.map((row) => rowToMessage(row, userId));
  const seenNow = rows.filter(
    (row) =>
      row.delete_after_seen &&
      row.sender_id !== userId &&
      !row.deleted_for_everyone,
  );
  await softDeleteMessages(
    conversationId,
    seenNow.map((row) => row.id),
  );
  return messages;
}

async function sendMessage(conversationId, userId, message) {
  const participants = await assertParticipant(conversationId, userId);
  const id = String(message.id || crypto.randomUUID());
  const createdAtMs = Number(message.createdAt) || Date.now();
  const {
    id: _id,
    senderId: _senderId,
    mine: _mine,
    status: _status,
    createdAt: _createdAt,
    starredByMe: _starredByMe,
    pinnedAt: _pinnedAt,
    reactions: _reactions,
    editedAt: _editedAt,
    deletedAt: _deletedAt,
    deletedForEveryone: _deletedForEveryone,
    ...payload
  } = message;
  const retentionMode = await getRetentionMode(conversationId, userId);
  let expiresAt = null;
  let deleteAfterSeen = 0;
  if (retentionMode === "24_hours") {
    expiresAt = new Date(createdAtMs + 24 * 60 * 60 * 1000);
  } else if (retentionMode === "7_days") {
    expiresAt = new Date(createdAtMs + 7 * 24 * 60 * 60 * 1000);
  } else if (retentionMode === "after_seen") {
    deleteAfterSeen = 1;
  }
  await query(
    `INSERT INTO chat_messages (id, conversation_id, sender_id, message_type, payload, status, created_at_ms, updated_at_ms, expires_at, delete_after_seen)
     VALUES (?, ?, ?, ?, ?, 'sent', ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE payload = VALUES(payload)`,
    [
      id,
      conversationId,
      userId,
      message.type || "text",
      JSON.stringify(payload),
      createdAtMs,
      createdAtMs,
      expiresAt,
      deleteAfterSeen,
    ],
  );
  const [row] = await query(
    `SELECT * FROM chat_messages WHERE id = ? AND conversation_id = ?`,
    [id, conversationId],
  );
  const stored = rowToMessage(row, userId);
  const recipientId = participants.find((pid) => pid !== userId);
  if (recipientId) {
    notifyRecipient(conversationId, userId, recipientId, stored).catch(
      () => undefined,
    );
  }
  return stored;
}

async function notifyRecipient(conversationId, senderId, recipientId, message) {
  await query(
    `UPDATE chat_messages SET status = 'delivered', updated_at_ms = ?
     WHERE id = ? AND conversation_id = ? AND status = 'sent'`,
    [Date.now(), message.id, conversationId],
  );
  const settingsRows = await query(
    "SELECT settings FROM chat_conversation_settings WHERE conversation_id = ? AND user_id = ?",
    [conversationId, recipientId],
  );
  if (settingsRows.length) {
    const settings = parseJsonColumn(settingsRows[0].settings, {});
    if (settings.notificationMode === "muted") return;
    if (settings.mutedUntil && Number(settings.mutedUntil) > Date.now()) return;
  }
  const [profile] = await query(
    "SELECT first_name FROM profiles WHERE user_id = ?",
    [senderId],
  );
  const senderName = profile?.first_name || "Someone";
  const preview = message.text
    ? String(message.text).slice(0, 120)
    : "Sent you a message";
  await pushService.notifyUser(recipientId, {
    title: senderName,
    body: preview,
    conversationId,
  });
}

async function createDateProposal(conversationId, userId, date) {
  await assertParticipant(conversationId, userId);
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO date_proposals (id, conversation_id, proposer_id, status, venue, category, area, time_label)
     VALUES (?, ?, ?, 'proposed', ?, ?, ?, ?)`,
    [
      id,
      conversationId,
      userId,
      date?.venue || null,
      date?.category || null,
      date?.area || null,
      date?.time || null,
    ],
  );
  return { id, status: "proposed" };
}

async function updateDatePlanStatus(userId, proposalId, status) {
  if (!proposalId) {
    const err = new Error("proposalId is required");
    err.status = 400;
    throw err;
  }
  const rows = await query("SELECT * FROM date_proposals WHERE id = ?", [
    proposalId,
  ]);
  if (!rows.length) {
    const err = new Error("Date proposal not found");
    err.status = 404;
    throw err;
  }
  await assertParticipant(rows[0].conversation_id, userId);
  await query("UPDATE date_proposals SET status = ? WHERE id = ?", [
    status,
    proposalId,
  ]);
  return { id: proposalId, status };
}

async function shareLiveLocation(
  conversationId,
  userId,
  location,
  clientActionId,
) {
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

async function getSettings(conversationId, userId) {
  await assertParticipant(conversationId, userId);
  const rows = await query(
    "SELECT settings FROM chat_conversation_settings WHERE conversation_id = ? AND user_id = ?",
    [conversationId, userId],
  );
  if (!rows.length) return null;
  return parseJsonColumn(rows[0].settings, null);
}

async function saveSettings(conversationId, userId, settings) {
  await assertParticipant(conversationId, userId);
  await query(
    `INSERT INTO chat_conversation_settings (conversation_id, user_id, settings)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE settings = VALUES(settings)`,
    [conversationId, userId, JSON.stringify(settings)],
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
  editMessage,
  deleteMessage,
  setMessageState,
  getSettings,
  saveSettings,
};
