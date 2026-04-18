const express = require('express');
const router = express.Router();
const uploadController = require('./upload.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

// Presigned uploads require a valid token so we don't hand out R2 write
// URLs to anonymous callers. If the admin panel ever uses a separate admin
// JWT it should still pass through this middleware.
router.post('/presign', authMiddleware, uploadController.presign);

module.exports = router;
