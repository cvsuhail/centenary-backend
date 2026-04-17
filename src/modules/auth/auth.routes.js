const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');

router.post('/check-user', authController.checkUser);
router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/admin-login', authController.adminLogin);

module.exports = router;
