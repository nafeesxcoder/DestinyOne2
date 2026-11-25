const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

const credentials = require('../src/utils/credentials');
const { signFlowToken, verifyFlowToken } = require('../src/utils/flowToken');

test('usernames need 3-20 allowed characters and at least one letter', () => {
  assert.equal(credentials.isValidUsername('Ravi_K'), true);
  assert.equal(credentials.isValidUsername('ravi.k2'), true);
  assert.equal(credentials.isValidUsername('ab'), false);
  assert.equal(credentials.isValidUsername('a b'), false);
  assert.equal(credentials.isValidUsername('1234567890'), false);
  assert.equal(credentials.isValidUsername('x'.repeat(21)), false);
});

test('passwords follow the app rule: 10+ with upper, lower and a number', () => {
  assert.equal(credentials.isValidPassword('Abcdefghi1'), true);
  assert.equal(credentials.isValidPassword('abcdefghi1'), false);
  assert.equal(credentials.isValidPassword('Abcdefghij'), false);
  assert.equal(credentials.isValidPassword('Abc1'), false);
});

test('login box values are classified as email, phone or username', () => {
  assert.deepEqual(credentials.classifyLoginIdentifier('Me@X.com'), { channel: 'email', identifier: 'me@x.com' });
  assert.deepEqual(credentials.classifyLoginIdentifier('+14165550123'), { channel: 'phone', identifier: '+14165550123' });
  assert.deepEqual(credentials.classifyLoginIdentifier('00919876543210'), { channel: 'phone', identifier: '+919876543210' });
  assert.deepEqual(credentials.classifyLoginIdentifier(' Ravi_K '), { channel: 'username', identifier: 'ravi_k' });
});

test('password hashes verify and never match an empty hash', async () => {
  const hash = await credentials.hashPassword('Abcdefghi1');
  assert.equal(await credentials.comparePassword('Abcdefghi1', hash), true);
  assert.equal(await credentials.comparePassword('Wrong-pass1', hash), false);
  assert.equal(await credentials.comparePassword('Abcdefghi1', null), false);
});

test('flow tokens only work for the purpose they were issued for', () => {
  const token = signFlowToken({ purpose: 'reset', channel: 'email', identifier: 'me@x.com' });
  assert.equal(verifyFlowToken(token, 'reset').identifier, 'me@x.com');
  assert.throws(() => verifyFlowToken(token, 'register'));
});
