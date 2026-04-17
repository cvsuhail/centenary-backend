const express = require('express');
const router = express.Router();
const syncController = require('./sync.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

router.post('/', authMiddleware, syncController.syncData);

module.exports = router;
