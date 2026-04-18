const express = require('express');
const router = express.Router();
const controller = require('./announcement.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

// Public — the mobile dock polls this every time the app is foregrounded.
// No auth required so guest users see announcements too.
router.get('/active', controller.getActive);

// Admin CRUD. All protected by the standard bearer-token middleware. If a
// dedicated admin scope is introduced later, swap this for a role check.
router.get('/', authMiddleware, controller.list);
router.get('/:id', authMiddleware, controller.getById);
router.post('/', authMiddleware, controller.create);
router.put('/:id', authMiddleware, controller.update);
router.delete('/:id', authMiddleware, controller.remove);

module.exports = router;
