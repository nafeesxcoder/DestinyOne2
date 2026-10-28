const giftService = require("../services/giftService");

// Expires gifts nobody answered or paid for, and wipes addresses of finished orders.
async function run() {
  try {
    const expired = await giftService.expireStaleOrders();
    const purged = await giftService.purgeFinishedAddresses();
    if (expired || purged) console.log(`[gifts] expired ${expired} order(s), purged ${purged} address(es).`);
  } catch (error) {
    console.error("[gifts] maintenance failed:", error);
  }
}

// Runs inside the API process (single pm2 instance). Safe to overlap: every change
// is a guarded UPDATE, so two runs can never double-process an order.
function start(intervalMs = 10 * 60 * 1000) {
  setTimeout(run, 30 * 1000).unref();
  return setInterval(run, intervalMs).unref();
}

module.exports = { run, start };

if (require.main === module) {
  const { pool } = require("../config/db");
  run().finally(() => pool.end());
}
