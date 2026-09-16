const crypto = require('crypto');
const { query } = require('../config/db');

async function recordDecision(actorId, targetId, decision) {
  await query(
    `INSERT INTO match_decisions (id, actor_id, target_id, decision)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE decision = VALUES(decision)`,
    [crypto.randomUUID(), actorId, targetId, decision],
  );

  let mutual = false;

  if (decision === 'interested') {
    const [reciprocal] = await query(
      `SELECT id FROM match_decisions WHERE actor_id = ? AND target_id = ? AND decision = 'interested'`,
      [targetId, actorId],
    );
    if (reciprocal) {
      const [userA, userB] = [actorId, targetId].sort();
      await query(
        `INSERT IGNORE INTO mutual_matches (id, user_a_id, user_b_id) VALUES (?, ?, ?)`,
        [crypto.randomUUID(), userA, userB],
      );
      mutual = true;
    }
  }

  return { ok: true, mutual };
}

async function getMutualMatches(userId) {
  const rows = await query(
    `SELECT
       CASE WHEN mm.user_a_id = ? THEN mm.user_b_id ELSE mm.user_a_id END AS other_user_id,
       mm.created_at
     FROM mutual_matches mm
     WHERE mm.user_a_id = ? OR mm.user_b_id = ?
     ORDER BY mm.created_at DESC`,
    [userId, userId, userId],
  );

  const results = [];
  for (const row of rows) {
    const blocked = await query(
      `SELECT id FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)`,
      [userId, row.other_user_id, row.other_user_id, userId],
    );
    if (blocked.length) continue;
    const [profile] = await query(
      'SELECT first_name, age, city, profession, gender FROM profiles WHERE user_id = ?',
      [row.other_user_id],
    );
    const photos = await query(
      'SELECT photo_url FROM profile_photos WHERE user_id = ? ORDER BY position ASC',
      [row.other_user_id],
    );
    results.push({
      id: row.other_user_id,
      profileId: row.other_user_id,
      matchId: row.other_user_id,
      name: profile?.first_name || 'Member',
      age: profile?.age || 0,
      city: profile?.city || '',
      profession: profile?.profession || '',
      gender: profile?.gender || 'nonbinary',
      photo: photos[0]?.photo_url || '',
      photos: photos.map((p) => p.photo_url),
      matchedAt: row.created_at,
    });
  }
  return results;
}

module.exports = {
  recordDecision,
  getMutualMatches,
};