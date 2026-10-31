const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

router.get('/summary', analyticsController.summary);
router.get('/trend', analyticsController.trend);
router.get('/flaky', analyticsController.flaky);

module.exports = router;
