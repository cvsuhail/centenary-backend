const express = require('express');
const router = express.Router();
const feedController = require('./feed.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

router.get('/', feedController.getFeed);
router.get('/stats', authMiddleware, feedController.getStats);
router.post('/create', authMiddleware, feedController.createPost);
router.post('/react', authMiddleware, feedController.reactToPost);
router.post('/view', authMiddleware, feedController.viewPost);
router.post('/share', authMiddleware, feedController.sharePost);
router.delete('/:postId', authMiddleware, feedController.deletePost);

module.exports = router;
