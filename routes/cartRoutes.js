const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

// Add this new route to your cartRoutes.js
router.get('/coupons/available', cartController.getAvailableCoupons);

router.post('/remove-coupon', cartController.removeCoupon);

module.exports = router;
