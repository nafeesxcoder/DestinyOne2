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
  // Basic phone normalization: strip spaces/dashes, keep leading +
  return String(value).trim().replace(/[^\d+]/g, '');
}

module.exports = { generateNumericCode, hashCode, compareCode, normalizeIdentifier };
