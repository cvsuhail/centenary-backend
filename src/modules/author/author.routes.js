const express = require('express');
const router = express.Router();

const authMiddleware = require('../../middlewares/auth.middleware');
const authorController = require('./author.controller');

router.get('/', authMiddleware, authorController.listAuthors);
router.post('/', authMiddleware, authorController.createAuthor);
router.put('/:id', authMiddleware, authorController.updateAuthor);
router.delete('/:id', authMiddleware, authorController.deleteAuthor);

module.exports = router;
