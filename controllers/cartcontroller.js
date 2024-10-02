const Product = require('../models/poductcollection');
const Cart=require('../models/cartCollection')
const Address=require('../models/adresscollection')
const Order =require('../models/ordercollection')

// Add product to the cart
exports.getCart = async (req, res) => {
    try {
        // Ensure req.session.user is defined and is an ObjectId
        if (!req.session.user) {
            return res.redirect('/'); // Redirect if the user is not logged in
        }

        // Find the cart by user ID
        const cart = await Cart.findOne({ user: req.session.user }).populate('items.product');

        res.render('cart', { cart });
    } catch (err) {
        console.error(err); // Log the error for debugging
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
        const product = await Product.findById(productId);
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

        let cart = await Cart.findOne({ user: userId });

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
        const address = await Address.find({ userId:req.session.user});

        // Fetch the cart for the user, populate product details
        const cart = await Cart.findOne({ user: req.session.user }).populate('items.product');


        
        if (!cart || cart.items.length === 0) {
            // If the cart is empty or not found, send empty cart data
            return res.render('checkout', { address, cart: null });
        }

        // Dynamically calculate total price based on the product variants and quantity
        cart.total_price = cart.items.reduce((acc, item) => {
            const variant = item.product.variants.find(v => v._id.toString() === item.variantId);
            if (variant) {
                return acc + variant.price * item.quantity;
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
        const cart = await Cart.findOne({ user: req.session.user }).populate('items.product');

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
    return `ORD-${randomString}`; // Example output: "ORD-k8j4tr-RX2H7"
  }
  
  // Usage
  const newOrderId = generateOrderId();

  

        // Create a new order
        const newOrder = new Order({
            orderId: newOrderId,
            user: req.session.user,
            address: addressId,
            items: cart.items.map(item => ({
                product: item.product._id,
                variantId: item.variantId,
                quantity: item.quantity,
                price: item.price
            })),
            paymentMethod: paymentMethod,
            totalAmount: cart.total_price - 100, // Assuming you are applying a discount
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