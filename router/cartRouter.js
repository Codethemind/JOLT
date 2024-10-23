const express = require('express');
const router = express.Router();
const cartController=require('../controllers/cartcontroller')

router.post('/add', cartController.addToCart);
router.get('/', cartController.getCart);
router.post('/remove', cartController.removeFromCart);
router.post('/update', cartController.updateCart);
router.get('/checkout',cartController.getCheckout)
router.post('/order',cartController.placeOrder)
router.post('/cancel/:orderId',cartController.cancelOrder)
router.post('/apply-coupon', cartController.applyCoupon);
router.post('/remove-coupon', cartController.removeCoupon);
router.get('/coupons/available', cartController.getAvailableCoupons);
module.exports = router;
