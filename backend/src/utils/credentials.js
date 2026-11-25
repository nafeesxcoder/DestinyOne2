const bcrypt = require('bcryptjs');

const USERNAME_PATTERN = /^[a-z0-9_.]{3,20}$/;

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidUsername(value) {
  const name = normalizeUsername(value);
  // At least one letter, so a username can never look like a phone number.
  return USERNAME_PATTERN.test(name) && /[a-z]/.test(name);
}

// Same rule the app shows: 10+ characters with uppercase, lowercase and a number.
function isValidPassword(value) {
  const text = String(value || '');
  return text.length >= 10 && /[a-z]/.test(text) && /[A-Z]/.test(text) && /\d/.test(text);
}

// Decides what a login box value means: an email, a phone number, or a username.
function classifyLoginIdentifier(value) {
  const text = String(value || '').trim();
  if (text.includes('@')) return { channel: 'email', identifier: text.toLowerCase() };
  const digits = text.replace(/[^\d+]/g, '');
  if (/^\+\d{8,15}$/.test(digits) || /^\d{10,15}$/.test(digits)) {
    let phone = digits;
    if (phone.startsWith('00')) phone = `+${phone.slice(2)}`;
    return { channel: 'phone', identifier: phone };
  }
  return { channel: 'username', identifier: normalizeUsername(text) };
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function comparePassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

module.exports = {
  normalizeUsername,
  isValidUsername,
  isValidPassword,
  classifyLoginIdentifier,
  hashPassword,
  comparePassword,
};
