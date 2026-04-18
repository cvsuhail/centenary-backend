const express = require('express');
const router = express.Router();
const controller = require('./eventConfig.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

// Public read — mobile boot reads this to hydrate the countdown target.
router.get('/', controller.getConfig);

// Admin write.
router.put('/', authMiddleware, controller.updateConfig);

module.exports = router;
