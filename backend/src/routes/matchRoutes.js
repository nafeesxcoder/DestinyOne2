const express = require('express');
const matchController = require('../controllers/matchController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.post('/decide', matchController.decide);
router.get('/', matchController.getMatches);

module.exports = router;
