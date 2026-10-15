import { describe, expect, it } from 'vitest';
import { isEligibleMemberAge, isValidEmail, isValidPassword, isValidPhone, normalizeAuthPhone, buildPhoneNumber } from './validation';

describe('authentication validation', () => {
  it('normalizes formatted phone numbers to E.164', () => {
    expect(normalizeAuthPhone('(415) 555-0199')).toBe('+14155550199');
    expect(normalizeAuthPhone('+1 (415) 555-0199')).toBe('+14155550199');
    expect(normalizeAuthPhone('12345')).toBeNull();
    expect(isValidPhone('+1 (415) 555-0199')).toBe(true);
  });
  it('builds E.164 numbers from a country code and local number', () => {
    expect(buildPhoneNumber('+1', '(415) 555-0199')).toBe('+14155550199');
    expect(buildPhoneNumber('+1', '415')).toBeNull();
    expect(buildPhoneNumber('+91', '098765 43210')).toBe('+919876543210');
    expect(buildPhoneNumber('+91', '123')).toBeNull();
    expect(buildPhoneNumber('+1', '+91 98765 43210')).toBe('+919876543210');
  });
  it('rejects malformed emails', () => expect(isValidEmail('hello@')).toBe(false));
  it('requires a ten-character mixed password', () => {
    expect(isValidPassword('1234567890')).toBe(false);
    expect(isValidPassword('Destiny123')).toBe(true);
  });
  it('keeps membership within the adult 18 to 50 range', () => {
    expect(isEligibleMemberAge('17')).toBe(false);
    expect(isEligibleMemberAge('18')).toBe(true);
    expect(isEligibleMemberAge('50')).toBe(true);
    expect(isEligibleMemberAge('51')).toBe(false);
  });
});
