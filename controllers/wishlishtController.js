const Wishlist = require('../models/wishlistCollection');
const mongoose = require('mongoose');

// Add a product to the wishlist
exports.addToWishlist = async (req, res) => {
    const { productId, variantId } = req.body;
    const userId = req.session.user; // Assuming the user ID is stored in session

    if (!userId) {
        return res.status(401).json({ success: false, message: 'You need to log in first.' });
    }

    try {
        // Find the user's wishlist or create a new one if it doesn't exist
        let wishlist = await Wishlist.findOne({ user_id: userId });

        if (!wishlist) {
            wishlist = new Wishlist({
                user_id: userId,
                items: []
            });
        }

        // Check if the product is already in the wishlist
        const productExists = wishlist.items.some(item => 
            item.product.toString() === productId && item.variantId === variantId
        );

        if (productExists) {
            return res.status(400).json({ success: false, message: 'Product already in wishlist.' });
        }

        // Add the product to the wishlist
        wishlist.items.push({ product: new mongoose.Types.ObjectId(productId), variantId });
        await wishlist.save();

        res.status(200).json({ success: true, message: 'Product added to wishlist.' });
    } catch (error) {
        console.error('Error adding product to wishlist:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// Remove a product from the wishlist
exports.removeFromWishlist = async (req, res) => {
    const { productId, variantId } = req.body; // Get productId and variantId from the request body
    const userId = req.session.user; // Assuming the user ID is stored in the session

    if (!userId) {
        return res.status(401).json({ success: false, message: 'You need to log in to remove items from your wishlist.' });
    }

    try {
        // Find the user's wishlist
        const wishlist = await Wishlist.findOne({ user_id: userId });

        if (!wishlist) {
            return res.status(404).json({ success: false, message: 'Wishlist not found.' });
        }

        // Remove the item from the wishlist
        const originalLength = wishlist.items.length;
        wishlist.items = wishlist.items.filter(item => 
            !(item.product.toString() === productId && item.variantId === variantId)
        );

        await wishlist.save(); // Save the updated wishlist

        res.status(200).json({ success: true, message: 'Product removed from wishlist.' });
    } catch (error) {
        console.error('Error removing product from wishlist:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};



// Get the user's wishlist
exports.getWishlist = async (req, res) => {
    const userId = req.session.user; // Assuming the user ID is stored in the session

    if (!userId) {
        return res.status(401).json({ success: false, message: 'You need to log in to view your wishlist.' });
    }

    try {
        
        // Find the user's wishlist, populating product information
        const wishlist = await Wishlist.findOne({ user_id: userId }).populate('items.product');

        // Log the fetched wishlist for debugging
        console.log('Fetched Wishlist:', wishlist);

        // If the wishlist is empty or does not exist
        if (!wishlist || wishlist.items.length === 0) {
            return res.render('wishlist', { wishlist: [], message: 'Your wishlist is empty.' });
        }

        // Send the wishlist items to the view for rendering
        res.render('wishlist', { wishlist: wishlist.items, message: null });
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

