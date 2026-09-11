const express = require('express');
const chatController = require('../controllers/chatController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/:conversationId/messages', chatController.getMessages);
router.post('/:conversationId/messages', chatController.postMessage);
router.post('/:conversationId/date-proposal', chatController.postDateProposal);
router.put('/date-proposal/status', chatController.putDatePlanStatus);
router.post('/:conversationId/location', chatController.postLocation);
router.put('/:conversationId/messages/:messageId', chatController.putEditMessage);
router.delete('/:conversationId/messages/:messageId', chatController.deleteMessageHandler);
router.put('/:conversationId/messages/:messageId/state', chatController.putMessageState);

module.exports = router;