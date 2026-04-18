const express = require('express');
const router = express.Router();
const feedController = require('./feed.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

const { optionalAuth } = authMiddleware;

// Main Feed tab — volunteer-only. Guests use /feed/home + /feed/important.
router.get('/', authMiddleware, feedController.getFeed);
router.get('/stats', authMiddleware, feedController.getStats);
// Static paths must be declared before `/:postId` so Express doesn't route
// a GET /feed/<name> request into the dynamic-id handler.
router.get('/home', optionalAuth, feedController.getHomeFeed);
router.get('/important', optionalAuth, feedController.getImportantFeed);
// Cheap 5-minute polling probe — see getFeedSync.
router.get('/sync', optionalAuth, feedController.getFeedSync);
router.get('/:postId', optionalAuth, feedController.getPostById);
router.post('/create', authMiddleware, feedController.createPost);
router.put('/:postId', authMiddleware, feedController.updatePost);
// /react, /view, /share accept either a bearer token (volunteer) or a
// valid X-Guest-Id header (guest). The controller 401s if neither is
// present, so wiring `optionalAuth` here just lets guests through the
// middleware layer.
router.post('/react', optionalAuth, feedController.reactToPost);
router.post('/view', optionalAuth, feedController.viewPost);
router.post('/share', optionalAuth, feedController.sharePost);
router.delete('/:postId', authMiddleware, feedController.deletePost);

module.exports = router;
