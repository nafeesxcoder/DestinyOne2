const express = require('express');
const coupleController = require('../controllers/coupleController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/hub', coupleController.getHub);
router.get('/search', coupleController.searchPartner);
router.post('/request', coupleController.sendRequest);
router.post('/respond', coupleController.respondRequest);
router.put('/mode', coupleController.setMode);

module.exports = router;