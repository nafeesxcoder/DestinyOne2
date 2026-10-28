const giftService = require("../services/giftService");

// Mounted with express.raw (see app.js): Stripe signs the exact bytes it sent, so the
// body must not be parsed as JSON before the signature is checked.
async function handle(req, res) {
  let event;
  try {
    event = giftService.constructStripeEvent(req.body, req.headers["stripe-signature"]);
  } catch (error) {
    const status = error.status || 400;
    if (status === 400) console.warn(`[stripe] rejected webhook: ${error.message}`);
    return res.status(status).json({ error: status === 503 ? error.message : "Invalid signature" });
  }
  try {
    const result = await giftService.handleStripeEvent(event);
    return res.json({ received: true, handled: !!result.handled });
  } catch (error) {
    // 500 makes Stripe retry later; every handler is idempotent so a retry is safe.
    console.error(`[stripe] failed to process ${event.type} ${event.id}:`, error);
    return res.status(500).json({ error: "Processing failed" });
  }
}

module.exports = { handle };
