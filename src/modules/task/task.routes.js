const express = require('express');
const router = express.Router();
const taskController = require('./task.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

router.get('/', authMiddleware, taskController.getTasks);
router.post('/update', authMiddleware, taskController.updateTask);

module.exports = router;
