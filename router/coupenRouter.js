// routes/coupons.js

const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');

router.get('/', couponController.getAllCoupons);
router.post('/create', couponController.createCoupon);
router.post('/edit/:id', couponController.updateCoupon);
router.post('/delete/:id', couponController.deleteCoupon);
router.post('/restore/:id', couponController.restoreCoupon);


module.exports = router;
