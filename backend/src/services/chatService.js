const crypto = require("crypto");
const { query } = require("../config/db");
const pushService = require("./pushService");
const realtime = require("./realtime");

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

// A mutual-match conversation is ADDRESSED by the other person's user id, so
// in the API the same chat has a different id for each participant. Rows
// must still live under ONE key shared by both people, otherwise each side
// would only read back its own messages (and anyone could read what other
// people sent to the same partner). That stored key is "dm:<idA>:<idB>"
// with the two user ids sorted. Couple chats use their shared connection id.
const DM_PREFIX = "dm:";
function pairKey(a, b) {
  return DM_PREFIX + [String(a), String(b)].sort().join(":");
}
async function resolveConversation(conversationId, userId) {
  const participants = await assertParticipant(conversationId, userId);
  const key = participants.includes(conversationId)
    ? pairKey(participants[0], participants[1])
    : conversationId;
  return { participants, key };
}
// Access check for an id read back from the database (a stored key).
async function assertStoredParticipant(storedId, userId) {
  if (String(storedId).startsWith(DM_PREFIX)) {
    const ids = String(storedId).slice(DM_PREFIX.length).split(":");
    const other = ids.find((id) => id !== userId);
    if (!ids.includes(userId) || !other) {
      const err = new Error("You do not have access to this conversation.");
      err.status = 403;
      throw err;
    }
    return assertParticipant(other, userId);
  }
  return assertParticipant(storedId, userId);
}

// Translate the API id for the viewer receiving an event.
function conversationIdForViewer(participants, conversationId, viewerId) {
  if (!participants.includes(conversationId)) return conversationId;
  return participants.find((pid) => pid !== viewerId) || conversationId;
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
    reactions: (() => {
      const mine = reactionsMap[viewerId];
      const otherId = Object.keys(reactionsMap).find((id) => id !== viewerId);
      const partner = otherId ? reactionsMap[otherId] : undefined;
      if (!mine && !partner) return undefined;
      const result = {};
      if (mine) result.me = mine;
      if (partner) result.partner = partner;
      return result;
    })(),
    editedAt: row.edited_at
      ? new Date(row.edited_at).getTime()
      : payload.editedAt,
    deletedAt: row.deleted_at ? new Date(row.deleted_at).getTime() : undefined,
    deletedForEveryone: !!row.deleted_for_everyone,
  };
}

// Push a changed message (edit / delete / reaction) to both participants,
// each rendered from their own point of view (mine, reactions, stars).
async function emitMessageUpdate(conversationId, row, actingUserId) {
  try {
    const participants = await assertParticipant(conversationId, actingUserId);
    participants.forEach((pid) =>
      realtime.emitToUser(pid, "message:update", {
        conversationId: conversationIdForViewer(participants, conversationId, pid),
        message: rowToMessage(row, pid),
      }),
    );
  } catch {
    /* realtime is best-effort */
  }
}

async function getOwnedMessage(conversationId, userId, messageId) {
  const { key } = await resolveConversation(conversationId, userId);
  const rows = await query(
    "SELECT * FROM chat_messages WHERE id = ? AND conversation_id = ?",
    [messageId, key],
  );
  if (!rows.length) {
    const err = new Error("Message not found");
    err.status = 404;
    throw err;
  }
  return { row: rows[0], key };
}

async function editMessage(conversationId, userId, messageId, text) {
  const { row, key } = await getOwnedMessage(conversationId, userId, messageId);
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
    [JSON.stringify(payload), Date.now(), messageId, key],
  );
  const [updated] = await query(
    "SELECT * FROM chat_messages WHERE id = ? AND conversation_id = ?",
    [messageId, key],
  );
  emitMessageUpdate(conversationId, updated, userId);
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

// `key` is the stored conversation key (see resolveConversation).
async function softDeleteMessages(key, ids) {
  if (!ids.length) return;
  await query(
    `UPDATE chat_messages SET payload = ?, deleted_at = NOW(6), deleted_for_everyone = 1, updated_at_ms = ?
     WHERE conversation_id = ? AND id IN (${ids.map(() => "?").join(",")})`,
    [JSON.stringify(CLEARED_PAYLOAD), Date.now(), key, ...ids],
  );
}

async function deleteMessage(conversationId, userId, messageId) {
  const { row, key } = await getOwnedMessage(conversationId, userId, messageId);
  if (row.sender_id !== userId) {
    const err = new Error("You can only delete your own messages.");
    err.status = 403;
    throw err;
  }
  await softDeleteMessages(key, [messageId]);
  const [updated] = await query(
    "SELECT * FROM chat_messages WHERE id = ? AND conversation_id = ?",
    [messageId, key],
  );
  emitMessageUpdate(conversationId, updated, userId);
  return rowToMessage(updated, userId);
}

async function setMessageState(conversationId, userId, messageId, input) {
  const { row, key } = await getOwnedMessage(conversationId, userId, messageId);
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
      key,
    ],
  );
  emitMessageUpdate(conversationId, { ...row, starred_by: JSON.stringify(starredBy), hidden_by: JSON.stringify(hiddenBy), pinned_at: pinnedAt, reactions: JSON.stringify(reactionsMap) }, userId);
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
  const { participants, key } = await resolveConversation(conversationId, userId);
  const expired = await query(
    `SELECT id FROM chat_messages WHERE conversation_id = ? AND expires_at IS NOT NULL
     AND expires_at <= NOW(6) AND deleted_for_everyone = 0`,
    [key],
  );
  await softDeleteMessages(
    key,
    expired.map((row) => row.id),
  );
  const rows = sinceMs
    ? await query(
        `SELECT * FROM chat_messages WHERE conversation_id = ? AND updated_at_ms > ?
         ORDER BY created_at_ms ASC`,
        [key, sinceMs],
      )
    : await query(
        `SELECT * FROM chat_messages WHERE conversation_id = ?
         ORDER BY created_at_ms ASC`,
        [key],
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
      [Date.now(), key, ...readIds],
    );
    toMarkRead.forEach((row) => {
      row.status = "read";
    });
    const senderIds = [...new Set(toMarkRead.map((row) => row.sender_id))];
    senderIds.forEach((sid) =>
      realtime.emitToUser(sid, "message:status", {
        conversationId: conversationIdForViewer(participants, conversationId, sid),
        ids: toMarkRead.filter((row) => row.sender_id === sid).map((row) => row.id),
        status: "read",
      }),
    );
  }
  const messages = rows.map((row) => rowToMessage(row, userId));
  const seenNow = rows.filter(
    (row) =>
      row.delete_after_seen &&
      row.sender_id !== userId &&
      !row.deleted_for_everyone,
  );
  await softDeleteMessages(
    key,
    seenNow.map((row) => row.id),
  );
  return messages;
}

// Called over the socket when the recipient has the chat open: marks every
// unread message from the partner as read and tells the partner instantly.
async function markConversationRead(conversationId, userId) {
  const { participants, key } = await resolveConversation(conversationId, userId);
  const rows = await query(
    `SELECT id FROM chat_messages
     WHERE conversation_id = ? AND sender_id <> ? AND status <> 'read' AND deleted_for_everyone = 0`,
    [key, userId],
  );
  const ids = rows.map((row) => row.id);
  if (ids.length) {
    await query(
      `UPDATE chat_messages SET status = 'read', updated_at_ms = ?
       WHERE conversation_id = ? AND id IN (${ids.map(() => "?").join(",")})`,
      [Date.now(), key, ...ids],
    );
    const partnerId = participants.find((pid) => pid !== userId);
    realtime.emitToUser(partnerId, "message:status", {
      conversationId: conversationIdForViewer(participants, conversationId, partnerId),
      ids,
      status: "read",
    });
  }
  return { ids };
}

async function sendMessage(conversationId, userId, message) {
  const { participants, key } = await resolveConversation(conversationId, userId);
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
      key,
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
    [id, key],
  );
  const stored = rowToMessage(row, userId);
  const recipientId = participants.find((pid) => pid !== userId);
  if (recipientId) {
    realtime.emitToUser(recipientId, "message:new", {
      conversationId: conversationIdForViewer(participants, conversationId, recipientId),
      message: rowToMessage(row, recipientId),
    });
    notifyRecipient(conversationId, key, userId, recipientId, stored).catch(
      () => undefined,
    );
  }
  return stored;
}

async function notifyRecipient(conversationId, key, senderId, recipientId, message) {
  await query(
    `UPDATE chat_messages SET status = 'delivered', updated_at_ms = ?
     WHERE id = ? AND conversation_id = ? AND status = 'sent'`,
    [Date.now(), message.id, key],
  );
  realtime.emitToUser(senderId, "message:status", {
    conversationId,
    ids: [message.id],
    status: "delivered",
  });
  // Settings are saved per person under the id THEY use for this chat.
  const recipientConversationId = conversationIdForViewer(
    [senderId, recipientId],
    conversationId,
    recipientId,
  );
  const settingsRows = await query(
    "SELECT settings FROM chat_conversation_settings WHERE conversation_id = ? AND user_id = ?",
    [recipientConversationId, recipientId],
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
    // The id the RECIPIENT uses for this chat (for a mutual match that is
    // the sender's user id, not the id the sender sent from), so tapping the
    // notification can open the right conversation.
    conversationId: recipientConversationId,
  });
}

async function createDateProposal(conversationId, userId, date) {
  const { key } = await resolveConversation(conversationId, userId);
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO date_proposals (id, conversation_id, proposer_id, status, venue, category, area, time_label)
     VALUES (?, ?, ?, 'proposed', ?, ?, ?, ?)`,
    [
      id,
      key,
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
  await assertStoredParticipant(rows[0].conversation_id, userId);
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
  const { key } = await resolveConversation(conversationId, userId);
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO live_locations (id, conversation_id, sharer_id, client_action_id, latitude, longitude, label, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude)`,
    [
      id,
      key,
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

// A partner is considered "online" if their last_active_at (touched on
// every authenticated request, see middleware/auth.js) falls inside this
// window — there's no real-time socket connection to check, so "online"
// here means "actively using the app within the last 45 seconds", close
// enough to feel live without a websocket layer.
const ONLINE_WINDOW_MS = 45 * 1000;

// "Is typing" is an even shorter-lived, higher-frequency signal than
// presence, so it lives purely in memory (per conversation+user) rather
// than in the database — there's nothing worth persisting once it goes
// stale. A typing ping is considered current for TYPING_WINDOW_MS after
// it was last sent; the frontend re-sends it every couple of seconds
// while the person keeps typing and explicitly clears it when they stop
// or send the message, but this TTL also covers the case where a tab is
// closed/crashes mid-type without ever sending that "stopped" signal.
const TYPING_WINDOW_MS = 6 * 1000;
const typingByKey = new Map();

function typingKey(conversationId, userId) {
  return `${conversationId}:${userId}`;
}

// Typing flags are keyed by the shared stored key, so the partner (who
// addresses the chat by a different id) finds them.
async function setTyping(conversationId, userId, typing) {
  const { key: storedKey } = await resolveConversation(conversationId, userId);
  const key = typingKey(storedKey, userId);
  if (!typing) {
    typingByKey.delete(key);
    return { ok: true, typing: false };
  }
  // Someone who has turned off sharing their own typing status shouldn't
  // have it recorded at all, in case anything else ever reads this map.
  const settings = await getSettings(conversationId, userId);
  if (settings && settings.shareTypingStatus === false) {
    typingByKey.delete(key);
    return { ok: true, typing: false };
  }
  typingByKey.set(key, Date.now());
  return { ok: true, typing: true };
}

function isTypingFresh(conversationId, userId) {
  const at = typingByKey.get(typingKey(conversationId, userId));
  return !!at && Date.now() - at < TYPING_WINDOW_MS;
}

async function getPartnerPresence(conversationId, userId) {
  const { participants, key } = await resolveConversation(conversationId, userId);
  const partnerId = participants.find((id) => id !== userId);
  if (!partnerId) return { online: false, lastActiveAt: null, typing: false };
  const [row] = await query('SELECT last_active_at FROM users WHERE id = ?', [
    partnerId,
  ]);
  const lastActiveAt = row?.last_active_at
    ? new Date(row.last_active_at).toISOString()
    : null;
  const online =
    !!lastActiveAt && Date.now() - new Date(lastActiveAt).getTime() < ONLINE_WINDOW_MS;
  const typing = isTypingFresh(key, partnerId);
  return { online, lastActiveAt, typing };
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

// The chat list: every mutual match with their last visible message and
// how many of their messages this member hasn't read yet. Newest first.
async function listConversations(userId) {
  // Lazy requires: keep module load order independent.
  const matchService = require("./matchService");
  const { previewFor } = require("./coupleService");
  const matches = await matchService.getMutualMatches(userId); // blocks already removed
  const conversations = [];
  for (const match of matches) {
    const key = pairKey(userId, match.id);
    const rows = await query(
      `SELECT sender_id, payload, status, created_at_ms, hidden_by FROM chat_messages
       WHERE conversation_id = ? AND deleted_for_everyone = 0
         AND (expires_at IS NULL OR expires_at > NOW(6))
       ORDER BY created_at_ms DESC LIMIT 20`,
      [key],
    );
    const visible = rows.find((row) => {
      const hidden = parseJsonColumn(row.hidden_by, []);
      return !(Array.isArray(hidden) && hidden.includes(userId));
    });
    const [unread] = await query(
      `SELECT COUNT(*) AS n FROM chat_messages
       WHERE conversation_id = ? AND sender_id <> ? AND status <> 'read' AND deleted_for_everyone = 0
         AND (expires_at IS NULL OR expires_at > NOW(6))`,
      [key, userId],
    );
    conversations.push({
      ...match,
      lastMessage: visible
        ? {
            preview: previewFor(visible.payload),
            at: Number(visible.created_at_ms),
            mine: visible.sender_id === userId,
            status: visible.status,
          }
        : null,
      unreadCount: Number(unread?.n || 0),
    });
  }
  const sortTime = (item) =>
    item.lastMessage?.at || new Date(item.matchedAt || 0).getTime() || 0;
  conversations.sort((a, b) => sortTime(b) - sortTime(a));
  return conversations;
}

module.exports = {
  listConversations,
  assertParticipant,
  listMessages,
  sendMessage,
  createDateProposal,
  updateDatePlanStatus,
  shareLiveLocation,
  getPartnerPresence,
  setTyping,
  isTypingFresh,
  conversationIdForViewer,
  markConversationRead,
  editMessage,
  deleteMessage,
  setMessageState,
  getSettings,
  saveSettings,
};
