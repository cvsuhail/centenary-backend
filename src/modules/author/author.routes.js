const express = require('express');
const router = express.Router();

const authMiddleware = require('../../middlewares/auth.middleware');
const authorController = require('./author.controller');

router.get('/', authMiddleware, authorController.listAuthors);

module.exports = router;
