const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profilecontroller');



// Edit User Profile
router.post('/profile/edit',profileController.postProfileEdit );

// Change Password
router.post('/password/change',profileController.postPasswordChange);


// Forgot Password: Send OTP
router.post('/send-otp', profileController.postSentOtp);


// Reset Password using OTP
router.post('/password/reset', profileController.postResetPassword);



module.exports = router;
