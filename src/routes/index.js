const express = require('express');
const router = express.Router();

const authRoutes = require('../modules/auth/auth.routes');
const feedRoutes = require('../modules/feed/feed.routes');
const taskRoutes = require('../modules/task/task.routes');
const syncRoutes = require('../modules/sync/sync.routes');
const uploadRoutes = require('../modules/upload/upload.routes');

router.use('/auth', authRoutes);
router.use('/feed', feedRoutes);
router.use('/tasks', taskRoutes);
router.use('/sync', syncRoutes);
router.use('/uploads', uploadRoutes);

module.exports = router;
