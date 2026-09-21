const asyncHandler = require("../utils/asyncHandler");
const { ApiError } = require("../middleware/errorHandler");
const giftService = require("../services/giftService");

const createOrder = asyncHandler(async (req, res) => {
  const { conversationId, ...input } = req.body;
  if (!conversationId) throw new ApiError(400, "conversationId is required");
  try {
    const order = await giftService.createOrder(
      conversationId,
      req.user.id,
      input,
    );
    res.json({ ok: true, order });
  } catch (error) {
    throw new ApiError(
      error.status || 500,
      error.message || "Could not create gift order",
    );
  }
});

const respond = asyncHandler(async (req, res) => {
  const { accept, deliveryAddress } = req.body;
  if (typeof accept !== "boolean")
    throw new ApiError(400, "accept (boolean) is required");
  try {
    const order = await giftService.respondToOrder(
      req.params.orderId,
      req.user.id,
      accept,
      deliveryAddress,
    );
    res.json({ ok: true, order });
  } catch (error) {
    throw new ApiError(
      error.status || 500,
      error.message || "Could not respond to gift order",
    );
  }
});

const checkout = asyncHandler(async (req, res) => {
  const { successUrl, cancelUrl } = req.body;
  if (!successUrl || !cancelUrl)
    throw new ApiError(400, "successUrl and cancelUrl are required");
  try {
    const result = await giftService.createCheckoutSession(
      req.params.orderId,
      req.user.id,
      successUrl,
      cancelUrl,
    );
    res.json({ ok: true, ...result });
  } catch (error) {
    throw new ApiError(
      error.status || 500,
      error.message || "Could not start checkout",
    );
  }
});

const confirm = asyncHandler(async (req, res) => {
  try {
    const order = await giftService.confirmPayment(
      req.params.orderId,
      req.user.id,
      req.query.session_id,
    );
    res.json({ ok: true, order });
  } catch (error) {
    throw new ApiError(
      error.status || 500,
      error.message || "Could not confirm payment",
    );
  }
});

const getOrder = asyncHandler(async (req, res) => {
  try {
    const order = await giftService.getOrder(req.params.orderId, req.user.id);
    res.json({ ok: true, order });
  } catch (error) {
    throw new ApiError(
      error.status || 500,
      error.message || "Could not read gift order",
    );
  }
});

module.exports = { createOrder, respond, checkout, confirm, getOrder };
