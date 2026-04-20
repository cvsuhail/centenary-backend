const express = require('express');
const router = express.Router();

const authRoutes = require('../modules/auth/auth.routes');
const feedRoutes = require('../modules/feed/feed.routes');
const taskRoutes = require('../modules/task/task.routes');
const syncRoutes = require('../modules/sync/sync.routes');
const uploadRoutes = require('../modules/upload/upload.routes');
const announcementRoutes = require('../modules/announcement/announcement.routes');
const eventConfigRoutes = require('../modules/eventConfig/eventConfig.routes');
const authorRoutes = require('../modules/author/author.routes');
const storyRoutes = require('../modules/story/story.routes');

router.use('/auth', authRoutes);
router.use('/feed', feedRoutes);
router.use('/tasks', taskRoutes);
router.use('/sync', syncRoutes);
router.use('/uploads', uploadRoutes);
router.use('/authors', authorRoutes);
router.use('/announcements', announcementRoutes);
router.use('/event-config', eventConfigRoutes);
router.use('/stories', storyRoutes);

module.exports = router;
