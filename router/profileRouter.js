const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profilecontroller');

router.post('/profile/edit',profileController.postProfileEdit );
router.post('/password/change',profileController.postPasswordChange);
router.post('/send-otp', profileController.postSentOtp);
router.post('/password/reset', profileController.postResetPassword);



module.exports = router;
