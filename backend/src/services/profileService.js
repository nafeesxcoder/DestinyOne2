const crypto = require('crypto');
const { query } = require('../config/db');

async function getFullProfile(userId) {
  const [profile] = await query('SELECT * FROM profiles WHERE user_id = ?', [userId]);
  const photos = await query(
    'SELECT id, photo_url, position FROM profile_photos WHERE user_id = ? ORDER BY position ASC',
    [userId],
  );
  const vibes = await query('SELECT vibe FROM profile_vibes WHERE user_id = ?', [userId]);
  const [intent] = await query('SELECT * FROM profile_intent WHERE user_id = ?', [userId]);
  const [prefs] = await query('SELECT * FROM matching_preferences WHERE user_id = ?', [userId]);
  const [mode] = await query('SELECT mode FROM experience_mode WHERE user_id = ?', [userId]);

  return {
    profile: profile || null,
    photos: photos.map((p) => p.photo_url),
    vibes: vibes.map((v) => v.vibe),
    intent: intent || null,
    preferences: prefs
      ? {
          ...prefs,
          cities: safeParseJson(prefs.cities, []),
          intents: safeParseJson(prefs.intents, []),
          must_have_vibes: safeParseJson(prefs.must_have_vibes, []),
        }
      : null,
    experienceMode: mode?.mode || 'seeking',
  };
}

function safeParseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function upsertProfile(userId, input) {
  const {
    firstName, gender, age, height, city, profession, religion, community, about,
  } = input;

  await query(
    `INSERT INTO profiles (user_id, first_name, gender, age, height, city, profession, religion, community, about)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       first_name = VALUES(first_name), gender = VALUES(gender), age = VALUES(age),
       height = VALUES(height), city = VALUES(city), profession = VALUES(profession),
       religion = VALUES(religion), community = VALUES(community), about = VALUES(about)`,
    [userId, firstName || null, gender || null, age || null, height || null, city || null, profession || null, religion || null, community || null, about || null],
  );
}

async function replacePhotos(userId, photoUrls) {
  await query('DELETE FROM profile_photos WHERE user_id = ?', [userId]);
  for (let i = 0; i < photoUrls.length; i += 1) {
    await query(
      'INSERT INTO profile_photos (id, user_id, photo_url, position) VALUES (?, ?, ?, ?)',
      [crypto.randomUUID(), userId, photoUrls[i], i],
    );
  }
}

async function replaceVibes(userId, vibes) {
  await query('DELETE FROM profile_vibes WHERE user_id = ?', [userId]);
  for (const vibe of vibes) {
    await query('INSERT INTO profile_vibes (user_id, vibe) VALUES (?, ?)', [userId, vibe]);
  }
}

async function upsertIntent(userId, input) {
  const { intent, timeline, children, family, relocation } = input;
  await query(
    `INSERT INTO profile_intent (user_id, intent, timeline, children, family, relocation)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       intent = VALUES(intent), timeline = VALUES(timeline), children = VALUES(children),
       family = VALUES(family), relocation = VALUES(relocation)`,
    [userId, intent || null, timeline || null, children || null, family || null, relocation || null],
  );
}

async function upsertPreferences(userId, input) {
  const {
    lookingFor, minAge, maxAge, cities, intents, mustHaveVibes,
    familyPriority, children, marriageTimeline, relocation, distancePreference, smartDiscovery,
  } = input;

  await query(
    `INSERT INTO matching_preferences
       (user_id, looking_for, min_age, max_age, cities, intents, must_have_vibes,
        family_priority, children, marriage_timeline, relocation, distance_preference, smart_discovery)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       looking_for = VALUES(looking_for), min_age = VALUES(min_age), max_age = VALUES(max_age),
       cities = VALUES(cities), intents = VALUES(intents), must_have_vibes = VALUES(must_have_vibes),
       family_priority = VALUES(family_priority), children = VALUES(children),
       marriage_timeline = VALUES(marriage_timeline), relocation = VALUES(relocation),
       distance_preference = VALUES(distance_preference), smart_discovery = VALUES(smart_discovery)`,
    [
      userId,
      lookingFor || 'everyone',
      minAge ?? 21,
      maxAge ?? 45,
      JSON.stringify(cities || []),
      JSON.stringify(intents || []),
      JSON.stringify(mustHaveVibes || []),
      familyPriority || null,
      children || null,
      marriageTimeline || null,
      relocation || null,
      distancePreference ?? null,
      smartDiscovery ? 1 : 0,
    ],
  );
}

async function setExperienceMode(userId, mode) {
  await query(
    `INSERT INTO experience_mode (user_id, mode) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE mode = VALUES(mode)`,
    [userId, mode],
  );
}

async function markOnboardingComplete(userId) {
  await query('UPDATE profiles SET onboarding_complete = 1 WHERE user_id = ?', [userId]);
}

module.exports = {
  getFullProfile,
  upsertProfile,
  replacePhotos,
  replaceVibes,
  upsertIntent,
  upsertPreferences,
  setExperienceMode,
  markOnboardingComplete,
};