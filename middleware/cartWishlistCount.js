const Cart = require('../models/cartCollection');
const Wishlist = require('../models/wishlistCollection');

const cartWishlistCount = async (req, res, next) => {
    res.locals.cartCount = 0;
    res.locals.wishlistCount = 0;

    if (req.session && req.session.user) {
        try {
            const cart = await Cart.findOne({ user: req.session.user });
            const wishlist = await Wishlist.findOne({ user_id: req.session.user });

            res.locals.cartCount = cart ? cart.items.length : 0;
            res.locals.wishlistCount = wishlist ? wishlist.items.length : 0;

        } catch (error) {
            console.error('Error fetching cart/wishlist counts:', error);
        }
    }
    next();
};

module.exports = cartWishlistCount;