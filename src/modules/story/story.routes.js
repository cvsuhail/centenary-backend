const express = require('express');
const router = express.Router();
const {
  getStories,
  getStoryById,
  createStory,
  updateStory,
  deleteStory,
  reactToStory,
  viewStory,
  getAllStoriesAdmin,
} = require('./story.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const { guestAuth } = authMiddleware;

// Public/Guest routes (no auth required)
router.get('/', guestAuth, getStories);
router.get('/admin', authMiddleware, getAllStoriesAdmin);
router.get('/:storyId', guestAuth, getStoryById);

// Protected routes (auth required)
router.post('/', authMiddleware, createStory);
router.put('/:storyId', authMiddleware, updateStory);
router.delete('/:storyId', authMiddleware, deleteStory);

// User interaction routes (auth or guest)
router.post('/react', guestAuth, reactToStory);
router.post('/view', guestAuth, viewStory);

module.exports = router;
