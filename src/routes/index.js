const express = require('express');
const router = express.Router();

const authRoutes = require('../modules/auth/auth.routes');
const feedRoutes = require('../modules/feed/feed.routes');
const taskRoutes = require('../modules/task/task.routes');
const syncRoutes = require('../modules/sync/sync.routes');

router.use('/auth', authRoutes);
router.use('/feed', feedRoutes);
router.use('/tasks', taskRoutes);
router.use('/sync', syncRoutes);

module.exports = router;
