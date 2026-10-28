const crypto = require("crypto");
const env = require("../config/env");

// AES-256-GCM for delivery addresses. Stored in the JSON column as
// {"enc":"v1","iv":...,"tag":...,"data":...}. Without GIFT_ADDRESS_KEY the address is
// stored as-is (so nothing breaks before the key is set); anything already encrypted
// still needs the key to be read.
function getKey() {
  const raw = env.gifts.addressKey;
  if (!raw) return null;
  const key = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("GIFT_ADDRESS_KEY must be 32 bytes (64 hex chars or base64).");
  }
  return key;
}

function encryptAddress(address) {
  if (address === null || address === undefined) return null;
  const key = getKey();
  if (!key) return JSON.stringify(address);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([
    cipher.update(JSON.stringify(address), "utf8"),
    cipher.final(),
  ]);
  return JSON.stringify({
    enc: "v1",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: data.toString("base64"),
  });
}

function decryptAddress(stored) {
  if (stored === null || stored === undefined) return null;
  const value = typeof stored === "string" ? JSON.parse(stored) : stored;
  if (!value || value.enc !== "v1") return value;
  const key = getKey();
  if (!key) throw new Error("GIFT_ADDRESS_KEY is required to read this address.");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(value.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(value.tag, "base64"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(value.data, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(plain.toString("utf8"));
}

module.exports = { encryptAddress, decryptAddress };
