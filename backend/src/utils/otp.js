const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const env = require('../config/env');

function generateNumericCode(length = env.otp.length) {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += digits[crypto.randomInt(0, digits.length)];
  }
  return code;
}

async function hashCode(code) {
  return bcrypt.hash(code, 10);
}

async function compareCode(code, hash) {
  return bcrypt.compare(code, hash);
}

function normalizeIdentifier(channel, value) {
  if (channel === 'email') return String(value).trim().toLowerCase();
  // Phone normalization to E.164: strip spaces/dashes/brackets, turn a
  // leading "00" into "+". Numbers without a country code are returned
  // as-is and rejected by isValidPhone().
  let phone = String(value).trim().replace(/[^\d+]/g, '');
  if (phone.startsWith('00')) phone = `+${phone.slice(2)}`;
  return phone;
}

function isValidPhone(phone) {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

module.exports = { generateNumericCode, hashCode, compareCode, normalizeIdentifier, isValidPhone };
