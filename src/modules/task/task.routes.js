const express = require('express');
const router = express.Router();
const taskController = require('./task.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const optionalAuth = require('../../middlewares/auth.middleware').optionalAuth;
const guestAuth = require('../../middlewares/auth.middleware').guestAuth;

// Admin statistics and notification routes (must be before /:id)
router.get('/admin/statistics', authMiddleware, taskController.getTaskStatistics);

// Public routes for guests
router.get('/', guestAuth, taskController.getTasks);
router.get('/:id/completion-details', authMiddleware, taskController.getTaskCompletionDetails);
router.get('/:id', guestAuth, taskController.getTaskById);

// Authenticated routes for task completion
router.post('/:id/complete', authMiddleware, taskController.markTaskComplete);

// Admin-only routes (create, update, delete)
router.post('/', authMiddleware, taskController.createTask);
router.put('/:id', authMiddleware, taskController.updateTask);
router.delete('/:id', authMiddleware, taskController.deleteTask);

router.post('/:taskId/reminder', authMiddleware, taskController.sendTaskReminder);

module.exports = router;
