const express = require('express');
const router = express.Router();
const otpController = require('../controllers/otpController');

router.post('/forgot-password', otpController.forgotPassword);
router.post('/verify-otp', otpController.verifyOtp);
router.post('/reset-password', otpController.resetPassword);

module.exports = router;
