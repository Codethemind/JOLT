const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlishtController');


// Route to add a product to the wishlist
router.post('/add', wishlistController.addToWishlist);

// Route to remove a product from the wishlist
router.post('/remove', wishlistController.removeFromWishlist);

// Route to get the user's wishlist
router.get('/', wishlistController.getWishlist);

module.exports = router;
