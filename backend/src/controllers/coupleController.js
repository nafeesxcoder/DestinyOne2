const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
const coupleService = require('../services/coupleService');

const searchPartner = asyncHandler(async (req, res) => {
  const { phone } = req.query;
  if (!phone || typeof phone !== 'string')
    throw new ApiError(400, 'phone query parameter is required');
  const partner = await coupleService.searchByPhone(phone.trim(), req.user.id);
  if (!partner) return res.json({ ok: true, found: false });
  res.json({ ok: true, found: true, ...partner });
});

const sendRequest = asyncHandler(async (req, res) => {
  const { memberId } = req.body;
  if (!memberId || typeof memberId !== 'string')
    throw new ApiError(400, 'memberId is required');
  try {
    const request = await coupleService.createRequest(req.user.id, memberId);
    res.json({ ok: true, ...request });
  } catch (error) {
    throw new ApiError(error.status || 500, error.message || 'Could not send request');
  }
});

const respondRequest = asyncHandler(async (req, res) => {
  const { requestId, accept } = req.body;
  if (!requestId || typeof accept !== 'boolean')
    throw new ApiError(400, 'requestId and accept (boolean) are required');
  try {
    const hub = await coupleService.respondToRequest(req.user.id, requestId, accept);
    res.json({ ok: true, ...hub });
  } catch (error) {
    throw new ApiError(error.status || 500, error.message || 'Could not respond to request');
  }
});

const getHub = asyncHandler(async (req, res) => {
  const hub = await coupleService.getHub(req.user.id);
  res.json({ ok: true, ...hub });
});

const setMode = asyncHandler(async (req, res) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') throw new ApiError(400, 'enabled (boolean) is required');
  await coupleService.setMode(req.user.id, enabled);
  res.json({ ok: true });
});

module.exports = { searchPartner, sendRequest, respondRequest, getHub, setMode };