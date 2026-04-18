const express = require('express');
const router = express.Router();
const feedController = require('./feed.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

const { optionalAuth, guestAuth } = authMiddleware;

// Main Feed tab - volunteer-only. Guests use /feed/home + /feed/important.
router.get('/', authMiddleware, feedController.getFeed);
router.get('/stats', authMiddleware, feedController.getStats);
// Static paths must be declared before `/:postId` so Express doesn't route
// a GET /feed/<name> request into the dynamic-id handler.
router.get('/home', guestAuth, feedController.getHomeFeed);
router.get('/important', guestAuth, feedController.getImportantFeed);
router.get('/:postId', guestAuth, feedController.getPostById);
router.post('/create', authMiddleware, feedController.createPost);
router.put('/:postId', authMiddleware, feedController.updatePost);
router.post('/react', guestAuth, feedController.reactToPost);
router.post('/view', guestAuth, feedController.viewPost);
router.post('/share', authMiddleware, feedController.sharePost);
router.delete('/:postId', authMiddleware, feedController.deletePost);

module.exports = router;
