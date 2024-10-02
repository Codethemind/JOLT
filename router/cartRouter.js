const express = require('express');
const router = express.Router();
const cartController=require('../controllers/cartcontroller')

// Add to cart route
router.post('/add', cartController.addToCart);

// Get user's cart
router.get('/', cartController.getCart);

// Remove from cart route
router.post('/remove', cartController.removeFromCart);

// Route to update the quantity of an item in the cart
router.post('/update', cartController.updateCart);

router.get('/checkout',cartController.getCheckout)

router.post('/order',cartController.placeOrder)


router.post('/cancel/:orderId',cartController.cancelOrder)



module.exports = router;
