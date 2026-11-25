const jwt = require('jsonwebtoken');
const env = require('../config/env');

// Short-lived proof that a code was verified (for signup or password reset).
// Signed with a derived secret so it can never be used as an access token.
const FLOW_EXPIRES_IN = '15m';

function secretFor() {
  return `${env.jwt.accessSecret}|flow`;
}

function signFlowToken({ purpose, channel, identifier }) {
  return jwt.sign({ purpose, channel, identifier }, secretFor(), { expiresIn: FLOW_EXPIRES_IN });
}

function verifyFlowToken(token, purpose) {
  const payload = jwt.verify(token, secretFor());
  if (payload.purpose !== purpose) throw new Error('Wrong token purpose');
  return payload;
}

module.exports = { signFlowToken, verifyFlowToken };
