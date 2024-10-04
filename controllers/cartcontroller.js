const Product = require('../models/poductcollection');
const Cart=require('../models/cartCollection')
const Address=require('../models/adresscollection')
const Order =require('../models/ordercollection')

exports.getCart = async (req, res) => {
    try {
        // Ensure req.session.user is defined and user is logged in
        if (!req.session.user) {
            return res.redirect('/'); // Redirect if the user is not logged in
        }
        
        console.log(8); // For debugging purposes

        // Find the cart by user ID and populate necessary fields (products, variants, and offers)
        const cart = await Cart.findOne({ user: req.session.user }).populate({
            path: 'items.product',
            populate: {
                path: 'variants.offer' // Populating the offer inside the variants
            }
        });

        console.log(9); // For debugging purposes

        // If no cart exists, handle this case and render an empty cart
        if (!cart) {
            return res.render('cart', { cart: null, total_price: 0 });
        }

        // Calculate total price considering offers
        let total_price = 0;

        // Iterate through the cart items to calculate the total price
        if (cart.items && cart.items.length > 0) {
            cart.items.forEach(item => {
                const variant = item.product.variants.find(v => v._id.toString() === item.variantId);

                if (variant) {
                    // Calculate the price: use discounted price if offer exists, otherwise regular price
                    const price = variant.offer && variant.offer.offerPercentage
                        ? variant.discount_price // Use discount price if an offer is available
                        : variant.price; // Fallback to regular price if no offer

                    total_price += price * item.quantity; // Update total price
                }
            });
        }

        // Assign the calculated total price to the cart object
        cart.total_price = total_price;

        console.log(10); // For debugging purposes

        // Render the cart page with updated cart and total price data
        res.render('cart', { cart });
    } catch (err) {
        console.error("Error fetching cart:", err); // Log the error for debugging
        res.status(500).send('Error fetching cart');
    }
};




exports.addToCart = async (req, res) => {
   
    
    const { productId, variantId, quantity } = req.body;

    try {
        // Find the user's cart or create a new one
        let cart = await Cart.findOne({ user: req.session.user });


        if (!cart) {
            cart = new Cart({ user: req.session.user, items: [], total_price: 0 });
        }

        // Find the product and variant
        const product = await Product.findById(productId).populate('variants.offer');
        const variant = product.variants.find(v => v._id == variantId);

        if (!variant) {
            return res.status(404).json({ message: 'Variant not found' });
        }

        // Check if the product with the same variant already exists in the cart
        const existingItemIndex = cart.items.findIndex(item => 
            item.product.toString() === productId && item.variantId === variantId
        );

        if (existingItemIndex > -1) {
            // If the item exists, update the quantity
            cart.items[existingItemIndex].quantity += parseInt(quantity);
        } else {
            // If it doesn't exist, add the new item to the cart
            cart.items.push({
                product: productId,
                variantId: variantId,
                quantity: parseInt(quantity),
                price: variant.price
            });
        }

        // Recalculate the total price
        cart.total_price = cart.items.reduce((acc, item) => acc + item.price * item.quantity, 0);

        await cart.save();

        return res.status(200).json({success:true, message: 'Item added to cart successfully', cart });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};


// Remove product from cart
exports.removeFromCart = async (req, res) => {
    try {
        const userId = req.session.user; // Adjust based on how you get user ID
        const { productId, variantId } = req.body;

        let cart = await Cart.findOne({ user: userId });

        if (cart) {
            cart.items = cart.items.filter(item => 
                !(item.product.toString() === productId && item.variantId === variantId)
            );

            // Recalculate total price
            cart.total_price = cart.items.reduce((acc, item) => acc + item.quantity * item.price, 0);

            await cart.save();
            return res.status(200).json({ success: true, cart });
        }

        return res.status(404).json({ success: false, message: 'Cart not found' });

    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server Error', error });
    }
};

exports.updateCart = async (req, res) => {
    try {
        const userId = req.session.user; // Get the user's ID from session or token
        const { productId, variantId, quantity } = req.body;

        let cart = await Cart.findOne({ user: userId }).populate({
            path: 'items.product',
            populate: {
                path: 'variants.offer' // Populating the offer inside the variants
            }
        });

        if (cart) {
            const itemIndex = cart.items.findIndex(item => 
                item.product.toString() === productId && item.variantId === variantId
            );

            if (itemIndex > -1) {
                // Update the quantity
                cart.items[itemIndex].quantity = parseInt(quantity);

                // Recalculate total price
                cart.total_price = cart.items.reduce((acc, item) => acc + item.quantity * item.price, 0);

                await cart.save();
                return res.status(200).json({ success: true, cart });
            } else {
                return res.status(404).json({ success: false, message: 'Item not found in cart' });
            }
        }

        return res.status(404).json({ success: false, message: 'Cart not found' });

    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server Error', error });
    }
};


exports.getCheckout = async (req, res) => {
    try {
        // Ensure the user is logged in
        if (!req.session.user) {
            return res.status(401).send("Unauthorized");
        }

        // Fetch addresses for the logged-in user
        const address = await Address.find({ userId: req.session.user });

        // Fetch the cart for the user, populate product details including the offer
        const cart = await Cart.findOne({ user: req.session.user }).populate({
            path: 'items.product',
            populate: {
                path: 'variants.offer' // Populating the offer inside the variants
            }
        });

        if (!cart || cart.items.length === 0) {
            // If the cart is empty or not found, send empty cart data
            return res.render('checkout', { address, cart: null });
        }

        // Dynamically calculate total price based on the product variants, offer, and quantity
        cart.total_price = cart.items.reduce((acc, item) => {
            const variant = item.product.variants.find(v => v._id.toString() === item.variantId);
            if (variant) {
                // Check if an offer exists for the variant and apply the offer price if available
                const priceToUse = variant.offer && variant.offer.offerPercentage
                    ? variant.discount_price // Use discount price if offer exists
                    : variant.price; // Otherwise, use the regular price

                return acc + priceToUse * item.quantity;
            }
            return acc;
        }, 0);

        // Render the checkout page with address and cart details
        res.render('checkout', { address, cart });
    } catch (error) {
        console.error("Error in fetching checkout details:", error);
        res.status(500).send("Internal Server Error");
    }
};





exports.placeOrder = async (req, res) => {
    try {
        // Ensure the user is logged in
        if (!req.session.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { addressId, paymentMethod } = req.body;

        // Find the cart for the user
        const cart = await Cart.findOne({ user: req.session.user }).populate({
            path: 'items.product',populate: {
                path: 'variants.offer' // Populating the offer inside the variants
            }
        });

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: "Cart is empty" });
        }

        // Stock validation
        for (const item of cart.items) {
            const product = item.product;
            const variant = product.variants.find(v => v._id.toString() === item.variantId);

            if (!variant) {
                return res.status(400).json({ message: `Product variant not found for ${product.product_name}` });
            }

            // Check stock availability
            if (variant.stock < item.quantity) {
                return res.status(400).json({
                    message: `Insufficient stock for ${product.product_name}. Only ${variant.stock} left in stock.`
                });
            }
        }

        // Deduct stock after validation
        for (const item of cart.items) {
            const product = item.product;
            const variant = product.variants.find(v => v._id.toString() === item.variantId);

            // Deduct the stock quantity
            variant.stock -= item.quantity;
            await product.save();
        }

        // Function to generate a short, unique order ID
        function generateOrderId() {
            const timestamp = Date.now().toString(36); // Convert the timestamp to base36 (shorter representation)
            const randomString = Math.random().toString(36).substr(2, 5).toUpperCase(); // Generate a random 5-character string
            return `ORD-${randomString}`; // Example output: "ORD-RX2H7"
        }

        // Usage
        const newOrderId = generateOrderId();

        // Calculate total amount for the order considering offers
        let totalAmount = 0;

        const orderItems = cart.items.map(item => {
            const product = item.product;
            const variant = product.variants.find(v => v._id.toString() === item.variantId);

            // Determine the price to use: discounted price if offer exists, otherwise regular price
            const itemPrice = variant.offer && variant.offer.offerPercentage
                ? variant.discount_price // Use discounted price if an offer is available
                : variant.price; // Use regular price if no offer

            // Update the total amount considering the quantity of each item
            totalAmount += itemPrice * item.quantity;

            // Return the item for the order
            return {
                product: item.product._id,
                variantId: item.variantId,
                quantity: item.quantity,
                price: itemPrice // Save the correct price (offer or regular price)
            };
        });

        // Apply any additional discounts (if applicable), for example, a flat discount of ₹100
        totalAmount -= 100; // Assuming you're applying a flat discount

        // Create a new order
        const newOrder = new Order({
            orderId: newOrderId,
            user: req.session.user,
            address: addressId,
            items: orderItems, // Items with correct prices (offer/regular)
            paymentMethod: paymentMethod,
            totalAmount: totalAmount, // Total price after considering offers and discounts
            orderStatus: 'Pending',
            orderStatusTimestamps: {
                pending: new Date()
            }
        });

        // Save the order
        await newOrder.save();

        // Optionally, clear the cart after placing the order
        await Cart.deleteOne({ user: req.session.user });

        res.status(201).json({ message: "Order placed successfully", order: newOrder });
    } catch (error) {
        console.error("Error placing order:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


// controllers/orderController.js

exports.cancelOrder = async (req, res) => {
    console.log(6456);
    
    try {
        const { orderId } = req.params;

        // Find the order by ID
        const order = await Order.findById(orderId).populate('items.product');

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Check if the order is still in "Pending" status
        if (order.orderStatus !== 'Pending') {
            return res.status(400).json({ message: "Only pending orders can be canceled" });
        }

        // Revert stock for each item in the order
        for (const item of order.items) {
            const product = item.product;
            const variant = product.variants.find(v => v._id.toString() === item.variantId);

            if (variant) {
                variant.stock += item.quantity; // Re-add the stock
                await product.save(); // Save the product with updated stock
            }
        }

        // Update the order status to 'Cancelled'
        order.orderStatus = 'Cancelled';
        order.orderStatusTimestamps.cancelled = new Date(); // Log cancellation time

        // Save the updated order
        await order.save();

        // Redirect back to the user's order page or show success
        res.redirect('/user/orders');
    } catch (error) {
        console.error("Error canceling order:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};