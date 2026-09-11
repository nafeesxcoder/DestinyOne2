const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
const chatService = require('../services/chatService');

function wrap(fn) {
  return asyncHandler(async (req, res) => {
    try {
      const data = await fn(req);
      res.json({ ok: true, saved: true, reason: 'backend', data });
    } catch (error) {
      throw new ApiError(error.status || 500, error.message || 'Request failed');
    }
  });
}

const getMessages = wrap(async (req) => {
  const since = req.query.since ? Number(req.query.since) : undefined;
  const messages = await chatService.listMessages(req.params.conversationId, req.user.id, since);
  return messages;
});

const postMessage = wrap(async (req) => {
  const message = req.body;
  if (!message || typeof message !== 'object' || typeof message.id !== 'string')
    throw new ApiError(400, 'A valid message object with an id is required');
  return chatService.sendMessage(req.params.conversationId, req.user.id, message);
});

const postDateProposal = wrap(async (req) => {
  return chatService.createDateProposal(req.params.conversationId, req.user.id, req.body);
});

const putDatePlanStatus = wrap(async (req) => {
  const { proposalId, status } = req.body;
  if (!['proposed', 'accepted', 'declined', 'cancelled'].includes(status))
    throw new ApiError(400, 'Invalid status');
  return chatService.updateDatePlanStatus(req.user.id, proposalId, status);
});

const postLocation = wrap(async (req) => {
  const { location, clientActionId } = req.body;
  if (!location || !clientActionId) throw new ApiError(400, 'location and clientActionId are required');
  return chatService.shareLiveLocation(req.params.conversationId, req.user.id, location, clientActionId);
});

const putEditMessage = wrap(async (req) => {
  const { text } = req.body;
  if (typeof text !== 'string') throw new ApiError(400, 'text is required');
  return chatService.editMessage(req.params.conversationId, req.user.id, req.params.messageId, text);
});

const deleteMessageHandler = wrap(async (req) => {
  return chatService.deleteMessage(req.params.conversationId, req.user.id, req.params.messageId);
});

const putMessageState = wrap(async (req) => {
  return chatService.setMessageState(req.params.conversationId, req.user.id, req.params.messageId, req.body);
});

module.exports = {
  getMessages,
  postMessage,
  postDateProposal,
  putDatePlanStatus,
  postLocation,
  putEditMessage,
  deleteMessageHandler,
  putMessageState,
};