export const normalizeAuthPhone = (value: string) => {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (trimmed.startsWith('+') && digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return null;
};

export const isValidPhone = (value: string) => normalizeAuthPhone(value) !== null;
export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
export const isValidPassword = (value: string) => value.length >= 10 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);
export const isEligibleMemberAge = (value: string, min = 18, max = 50) => {
  const age = Number(value.replace(/\D/g, ''));
  return Number.isInteger(age) && age >= min && age <= max;
};

/**
 * Build an E.164 number from a country dial code and what the user typed.
 * A number typed with its own "+" is used as-is. Returns null if invalid.
 * US/Canada (+1) must be exactly 10 digits.
 */
export const buildPhoneNumber = (dial: string, input: string) => {
  const trimmed = input.trim();
  if (trimmed.startsWith('+')) return normalizeAuthPhone(trimmed);
  let national = trimmed.replace(/\D/g, '');
  if (dial === '+1') {
    if (national.length === 11 && national.startsWith('1')) national = national.slice(1);
    return national.length === 10 ? `+1${national}` : null;
  }
  national = national.replace(/^0+/, '');
  const full = `${dial}${national}`;
  return national.length >= 6 && full.replace(/\D/g, '').length <= 15 ? full : null;
};
