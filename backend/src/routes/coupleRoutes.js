const express = require('express');
const coupleController = require('../controllers/coupleController');
const { requireAuth } = require('../middleware/auth');

const rateLimit = require('express-rate-limit');

const router = express.Router();
const contactsLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
  message: { error: 'Too many contact lookups. Please try again later.' },
});
router.use(requireAuth);

router.get('/hub', coupleController.getHub);
const peopleLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
  message: { error: 'Too many searches. Please try again in a few minutes.' },
});

router.get('/search', coupleController.searchPartner);
router.get('/people', peopleLimiter, coupleController.searchPeople);
router.get('/searchable', coupleController.getSearchable);
router.put('/searchable', coupleController.setSearchable);
router.post('/contacts/match', contactsLimiter, coupleController.matchContacts);
router.get('/partner/:connectionId', coupleController.getPartnerProfile);
router.post('/request', coupleController.sendRequest);
router.post('/respond', coupleController.respondRequest);
router.put('/mode', coupleController.setMode);
router.post('/disconnect', coupleController.disconnect);

module.exports = router;
