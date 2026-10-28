const crypto = require("crypto");
const env = require("../config/env");

// Support/ops endpoints are protected by a shared key in the X-Ops-Key header.
// If GIFT_OPS_KEY is not set the endpoints are switched off completely.
function requireOpsKey(req, res, next) {
  const expected = env.gifts.opsKey;
  if (!expected) return res.status(503).json({ error: "Ops access is not configured." });
  const given = String(req.headers["x-ops-key"] || "");
  const a = crypto.createHash("sha256").update(given).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  if (!crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: "Invalid ops key." });
  next();
}

module.exports = { requireOpsKey };
