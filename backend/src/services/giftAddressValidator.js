// Validates and normalises a gift delivery address supplied by the RECIPIENT.
// The sender can never send an address (see giftService.createOrder), so this is
// the only entry point for address data. Everything is whitelisted, trimmed and
// length-capped; HTML/control characters are rejected.

const SUPPORTED_COUNTRIES = new Set(["US", "CA", "IN"]);

const FIELD_LIMITS = {
  name: 80,
  phone: 20,
  line1: 120,
  line2: 120,
  city: 80,
  state: 40,
  postal: 20,
  country: 2,
  instructions: 250,
};

// Reject control characters and angle brackets (no HTML/scripts stored).
const FORBIDDEN = /[\u0000-\u001f\u007f<>]/;

function fail(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function cleanText(value, field, { required = false } = {}) {
  if (value === null || value === undefined) {
    if (required) throw fail(`${field} is required.`);
    return null;
  }
  if (typeof value !== "string") throw fail(`${field} must be text.`);
  const trimmed = value.trim();
  if (!trimmed) {
    if (required) throw fail(`${field} is required.`);
    return null;
  }
  if (FORBIDDEN.test(trimmed)) throw fail(`${field} contains invalid characters.`);
  const limit = FIELD_LIMITS[field];
  if (limit && trimmed.length > limit) throw fail(`${field} is too long (max ${limit}).`);
  return trimmed;
}

function validatePostal(country, postal) {
  const value = postal.toUpperCase().replace(/\s+/g, " ");
  if (country === "US" && !/^\d{5}(-\d{4})?$/.test(value)) {
    throw fail("postal code must look like a US ZIP (12345 or 12345-6789).");
  }
  if (country === "CA" && !/^[A-Z]\d[A-Z] ?\d[A-Z]\d$/.test(value)) {
    throw fail("postal code must look like a Canadian postal code (A1A 1A1).");
  }
  if (country === "IN" && !/^\d{6}$/.test(value)) {
    throw fail("postal code must be a 6-digit Indian PIN code.");
  }
  return value;
}

function validatePhone(phone) {
  // Digits, spaces, +, -, (). Between 7 and 15 digits.
  if (!/^[+()\-\s\d]+$/.test(phone)) throw fail("phone contains invalid characters.");
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) throw fail("phone must have 7-15 digits.");
  return phone;
}

/**
 * Returns a clean address object with ONLY the whitelisted fields, or throws a
 * 400 error. The result is what gets encrypted and stored.
 */
function validateDeliveryAddress(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw fail("A delivery address is required.");
  }

  const country = String(input.country || "").trim().toUpperCase();
  if (!SUPPORTED_COUNTRIES.has(country)) {
    throw fail("country must be one of: US, CA, IN.");
  }

  const address = {
    name: cleanText(input.name, "name", { required: true }),
    phone: cleanText(input.phone, "phone", { required: true }),
    line1: cleanText(input.line1, "line1", { required: true }),
    line2: cleanText(input.line2, "line2"),
    city: cleanText(input.city, "city", { required: true }),
    state: cleanText(input.state, "state", { required: country !== "IN" }),
    postal: cleanText(input.postal, "postal", { required: true }),
    country,
    instructions: cleanText(input.instructions, "instructions"),
  };

  address.phone = validatePhone(address.phone);
  address.postal = validatePostal(address.country, address.postal);
  if (address.state) address.state = address.state.toUpperCase();

  // Total size guard: even with per-field caps an address must stay small.
  const total = Object.values(address)
    .filter(Boolean)
    .reduce((sum, value) => sum + String(value).length, 0);
  if (total > 600) throw fail("delivery address is too long.");

  return address;
}

module.exports = { validateDeliveryAddress, SUPPORTED_COUNTRIES };
