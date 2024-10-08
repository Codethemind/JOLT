// routes/coupons.js

const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');

// Route to get all coupons
router.get('/', couponController.getAllCoupons);

// Route to create a new coupon
router.post('/create', couponController.createCoupon);

// Route to update a coupon
router.post('/edit/:id', couponController.updateCoupon);

// Route to soft delete a coupon
router.post('/delete/:id', couponController.deleteCoupon);

// Route to restore a coupon
router.post('/restore/:id', couponController.restoreCoupon);

module.exports = router;
