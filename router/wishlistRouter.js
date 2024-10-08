const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlishtController');

router.post('/add', wishlistController.addToWishlist);
router.post('/remove', wishlistController.removeFromWishlist);
router.get('/', wishlistController.getWishlist);

module.exports = router;
