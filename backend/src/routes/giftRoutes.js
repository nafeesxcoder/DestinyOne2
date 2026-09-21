const express = require("express");
const giftController = require("../controllers/giftController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.post("/orders", giftController.createOrder);
router.post("/orders/:orderId/respond", giftController.respond);
router.post("/orders/:orderId/checkout", giftController.checkout);
router.get("/orders/:orderId/confirm", giftController.confirm);
router.get("/orders/:orderId", giftController.getOrder);

module.exports = router;
