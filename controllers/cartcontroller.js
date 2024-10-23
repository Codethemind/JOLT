const Product = require('../models/poductcollection');
const brand = require('../models/brandcollection');
const category = require('../models/catagorycollection');
const Cart=require('../models/cartCollection')
const Address=require('../models/adresscollection')
const Order =require('../models/ordercollection')
const Coupon  =require('../models/coupencollection')
const Razorpay = require('razorpay');
const crypto = require('crypto'); // Add this at the top of your file
const Wallet = require('../models/walletCollection');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

exports.getCart = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/'); 
        }
        const cart = await Cart.findOne({ user: req.session.user }).populate({
            path: 'items.product',
            populate: {
                path: 'variants.offer' 
            }
        });
        if (!cart) {
            return res.render('cart', { cart: null, total_price: 0 });
        }
        let total_price = 0;
        if (cart.items && cart.items.length > 0) {
            cart.items.forEach(item => {
                const product = item.product;  
                const variant = product.variants.find(v => v._id.toString() === item.variantId);
                if (variant) {
                    const price = variant.offer && variant.offer.offerPercentage
                        ? variant.discount_price 
                        : variant.price; 
                    total_price += price * item.quantity; 
                }
            });
        }
        cart.total_price = total_price;
        res.render('cart', { cart, total_price });
    } catch (err) {
        console.error("Error fetching cart:", err);
        res.status(500).send('Error fetching cart');
    }
};


exports.addToCart = async (req, res) => {    
    const { productId, variantId, quantity } = req.body;
    try {
        // Ensure user is authenticated
        if (!req.session.user) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        let cart = await Cart.findOne({ user: req.session.user });
        if (!cart) {
            cart = new Cart({ 
                user: req.session.user,  // Ensure this line is present
                items: [], 
                total_price: 0 
            });
        }

        const product = await Product.findById(productId).populate('variants.offer');
        const variant = product.variants.find(v => v._id == variantId);
        if (!variant) {
            return res.status(404).json({ message: 'Variant not found' });
        }

        const existingItemIndex = cart.items.findIndex(item => 
            item.product.toString() === productId && item.variantId === variantId
        );

        if (existingItemIndex > -1) {
            cart.items[existingItemIndex].quantity += parseInt(quantity);
        } else {
            cart.items.push({
                product: productId,
                variantId: variantId,
                quantity: parseInt(quantity),
                price: variant.price
            });
        }

        cart.total_price = cart.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
        await cart.save();
        return res.status(200).json({success:true, message: 'Item added to cart successfully', cart });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.removeFromCart = async (req, res) => {
    try {
        const userId = req.session.user;
        const { productId, variantId } = req.body;
        let cart = await Cart.findOne({ user: userId });
        if (cart) {
            cart.items = cart.items.filter(item => 
                !(item.product.toString() === productId && item.variantId === variantId)
            );
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
        const userId = req.session.user; 
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized: No user session found.' });
        }
        const { productId, variantId, quantity } = req.body;
        let cart = await Cart.findOne({ user: userId }).populate({
            path: 'items.product',
            populate: {
                path: 'variants.offer' 
            }
        });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }   
        const itemIndex = cart.items.findIndex(item => 
            item.product._id.toString() === productId.toString() && 
            item.variantId.toString() === variantId.toString()
        );       
        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: 'Item not found in cart' });
        }
        const requestedQuantity = parseInt(quantity);
        if (requestedQuantity <= 0) {
            return res.status(400).json({ success: false, message: 'Quantity must be greater than zero.' });
        }
        const stock = cart.items[itemIndex].product.variants[0].stock; 
        if (requestedQuantity > stock) {
            return res.status(400).json({ success: false, message: `Insufficient stock. Only ${stock} items available.` });
        }
        cart.items[itemIndex].quantity = requestedQuantity;
        cart.total_price = cart.items.reduce((acc, item) => acc + item.quantity * (item.product.variants[0].offer ? item.product.variants[0].discount_price : item.price), 0);
        await cart.save();
        return res.status(200).json({ success: true, cart });
    } catch (error) {
        console.error('Error updating cart:', error);
        return res.status(500).json({ success: false, message: 'Server Error', error });
    }
};


exports.getCheckout = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).send("Unauthorized");
        }
        const address = await Address.find({ userId: req.session.user });
        const cart = await Cart.findOne({ user: req.session.user }).populate({
            path: 'items.product',
            populate: {
                path: 'variants.offer'
            }
        });
        if (!cart || cart.items.length === 0) {
            return res.render('checkout', { address, cart: null });
        }
        cart.total_price = cart.items.reduce((acc, item) => {
            const variant = item.product.variants.find(v => v._id.toString() === item.variantId);
            if (variant) {
                const priceToUse = variant.offer && variant.offer.offerPercentage
                    ? variant.discount_price 
                    : variant.price; 
                return acc + priceToUse * item.quantity;
            }
            return acc;
        }, 0);
        res.render('checkout', { address, cart });
    } catch (error) {
        console.error("Error in fetching checkout details:", error);
        res.status(500).send("Internal Server Error");
    }
};


exports.placeOrder = async (req, res) => {
    try {
        // Check if the user is logged in
        if (!req.session.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { addressId, paymentMethod } = req.body;

        // Fetch the cart for the current user, populating product variants, offers, category, and brand
        const cart = await Cart.findOne({ user: req.session.user }).populate({
            path: 'items.product',
            populate: [
                {
                    path: 'variants',
                    populate: {
                        path: 'offer'
                    }
                },
                {
                    path: 'category_id', // Populate category
                },
                {
                    path: 'brand_id' // Populate brand
                }
            ]
        });

        // Check if the cart is empty
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: "Cart is empty" });
        }

        let subtotal = 0;
        let totalDiscount = 0;

        // Iterate through each item in the cart
        for (const item of cart.items) {
            const product = item.product;
            const variant = product.variants.find(v => v._id.toString() === item.variantId);

            // Ensure the variant exists and has enough stock
            if (variant) {
                if (variant.stock < item.quantity) {
                    return res.status(400).json({ message: `Insufficient stock for ${product.product_name}` });
                }

                // Reduce the variant's stock based on the order quantity
                variant.stock -= item.quantity;
                await product.save();

                // Calculate the regular price for the quantity ordered
                const regularPrice = variant.price * item.quantity;
                let finalPrice = regularPrice;

                // Apply discount if the variant has an offer
                if (variant.offer && variant.offer.offerPercentage > 0) {
                    finalPrice = variant.discount_price * item.quantity;
                    totalDiscount += (regularPrice - finalPrice); // Calculate total discount
                }

                subtotal += regularPrice; // Calculate subtotal
                item.finalPrice = finalPrice / item.quantity; // Store the final price of the item

                // Update product's sold count
                product.sold += item.quantity;
                await product.save();

                // Increase the total sales count for the associated category (fully populated)
                const category = product.category_id;
                if (category) {
                    category.totalSales += item.quantity;
                    await category.save();
                }

                // Increase the total sales count for the associated brand (fully populated)
                const brand = product.brand_id;
                if (brand) {
                    brand.totalSales += item.quantity;
                    await brand.save();
                }
            }
        }

        // Apply any coupon discount
        let couponDiscount = 0;
        if (cart.appliedCoupon && cart.appliedCoupon.discount) {
            couponDiscount = cart.appliedCoupon.discount;
            totalDiscount += couponDiscount;
        }

        // Calculate total amount (subtotal - totalDiscount)
        let totalAmount = Math.max(0, subtotal - totalDiscount);
        totalAmount = Math.round(totalAmount * 100) / 100;

        if (isNaN(totalAmount) || totalAmount < 0) {
            throw new Error('Invalid total amount calculated');
        }

        // Disallow Cash on Delivery (COD) for orders above ₹1000
        if (paymentMethod === 'Cash on Delivery' && totalAmount > 1000) {
            return res.status(400).json({ message: "Cash on Delivery is not allowed for orders above ₹1000" });
        }

        // Apply shipping cost (Free for orders over ₹2000, otherwise ₹40)
        let shippingCost = totalAmount < 2000 ? 40 : 0;
        totalAmount += shippingCost;

        // Generate a unique order ID
        const newOrderId = await generateOrderId(); // Await to ensure ID is generated

        // Create a new order with the necessary details
        const newOrder = new Order({
            orderId: newOrderId,
            user: req.session.user,
            address: addressId,
            items: cart.items.map(item => {
                const variant = item.product.variants.find(v => v._id.toString() === item.variantId);
                return {
                    product: item.product._id,
                    variantId: item.variantId,
                    quantity: item.quantity,
                    price: variant.price,
                    discount_price: item.finalPrice,
                    offerPercentage: variant.offer ? variant.offer.offerPercentage : 0
                };
            }),
            paymentMethod: paymentMethod,
            totalAmount: totalAmount,
            subtotal: subtotal,
            totalDiscount: totalDiscount,
            shippingCost: shippingCost,
            couponCode: cart.appliedCoupon ? cart.appliedCoupon.code : null,
            discountAmount: couponDiscount,
            orderStatus: 'Pending',
            orderStatusTimestamps: {
                pending: new Date()
            }
        });
        
        // Handle different payment methods
        if (paymentMethod === 'Bank Transfer') {
            // Create a Razorpay order for Bank Transfer (online payment)
            const razorpayOrder = await razorpay.orders.create({
                amount: Math.round(totalAmount * 100),
                currency: 'INR',
                receipt: newOrderId,
                payment_capture: 1
            });

            // Save the Razorpay order ID to your order
            newOrder.razorpayOrderId = razorpayOrder.id;
            await newOrder.save();
            await Cart.deleteOne({ user: req.session.user });

        

            // Respond with the Razorpay order details and the new order
            return res.status(200).json({
                message: "Razorpay order created",
                razorpayOrder: razorpayOrder,
                order: newOrder
            });
        } else if (paymentMethod === 'Cash on Delivery') {
            // Save the order for COD and delete the cart
            await newOrder.save();
            await Cart.deleteOne({ user: req.session.user });

            // Respond with success message and order details
            return res.status(201).json({ message: "Order placed successfully", order: newOrder });
        } else {
            // Handle invalid payment methods
            return res.status(400).json({ message: "Invalid payment method" });
        }
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "Order already exists. Please try again." });
        }
        // Handle any unexpected errors
        console.error("Error placing order:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message, stack: error.stack });
    }
};



    

function generateOrderId() {
    const timestamp = Date.now().toString(36);
    const randomString = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `ORD-${randomString}-${timestamp}`;
}


exports.cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId).populate('items.product');

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (order.orderStatus !== 'Pending') {
            return res.status(400).json({ message: "Only pending orders can be canceled" });
        }

        // Restore stock and adjust sales counts for each item in the order
        for (const item of order.items) {
            const product = await Product.findById(item.product).populate('category_id brand_id');
            const variant = product.variants.find(v => v._id.toString() === item.variantId);

            if (variant) {
                // Restore stock
                variant.stock += item.quantity;

                // Reduce sold count for product
                product.sold -= item.quantity;
                if (product.sold < 0) product.sold = 0; // Ensure no negative sold count

                // Reduce sales count for category
                const category = product.category_id;
                if (category) {
                    category.totalSales -= item.quantity;
                    if (category.totalSales < 0) category.totalSales = 0; // Ensure no negative totalSales
                    await category.save();
                }

                // Reduce sales count for brand
                const brand = product.brand_id;
                if (brand) {
                    brand.totalSales -= item.quantity;
                    if (brand.totalSales < 0) brand.totalSales = 0; // Ensure no negative totalSales
                    await brand.save();
                }

                await product.save(); // Save product with updated stock and sold count
            }
        }

        // Mark the order as cancelled
        order.orderStatus = 'Cancelled';

        // Process refund to wallet if payment method was Bank Transfer
        if (order.paymentMethod === 'Bank Transfer') {
            let wallet = await Wallet.findOne({ userId: order.user });
            if (!wallet) {
                wallet = new Wallet({ userId: order.user, balance: 0 });
            }
            wallet.balance += order.totalAmount;
            wallet.transactions.push({
                amount: order.totalAmount,
                type: 'Credit',
                description: `Refund for cancelled order ${order.orderId}`,
                date: new Date()
            });
            await wallet.save();
        }

        await order.save();

        res.status(200).json({ message: "Order cancelled successfully and refund processed if applicable" });
    } catch (error) {
        console.error("Error canceling order:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


exports.applyCoupon = async (req, res) => {
    const { cartId, couponCode } = req.body;
    const userId = req.session.user;

    try {
        // Find the coupon by code
        const coupon = await Coupon.findOne({
            couponCode: couponCode,
            isDeleted: false,
            couponStartDate: { $lte: new Date() },
            couponEndDate: { $gte: new Date() }
        });

        if (!coupon) {
            return res.status(400).json({ message: 'Invalid or expired coupon code.' });
        }

        // Check if the user has already used this coupon
        const hasUsedCoupon = await Order.findOne({
            user: userId,
            couponCode: couponCode
        });

        if (hasUsedCoupon) {
            return res.status(400).json({ message: 'You have already used this coupon.' });
        }

        // Find the cart
        const cart = await Cart.findById(cartId).populate({
            path: 'items.product',
            populate: {
                path: 'variants.offer'
            }
        });

        if (!cart) {
            return res.status(404).json({ message: 'Cart not found.' });
        }

        // Calculate total price of the cart
        let totalPrice = 0;
        cart.items.forEach(item => {
            const variant = item.product.variants.find(v => v._id.toString() === item.variantId);
            if (variant) {
                const priceToUse = variant.offer && variant.offer.offerPercentage
                    ? variant.discount_price
                    : variant.price;
                totalPrice += priceToUse * item.quantity;
            }
        });

        // Check if the cart meets the minimum purchase requirement (e.g., ₹10,000)
        const minimumPurchaseAmount = 10000;  // Set minimum purchase requirement
        if (totalPrice < minimumPurchaseAmount) {
            return res.status(400).json({ message: `A minimum purchase of ₹${minimumPurchaseAmount} is required to use this coupon.` });
        }

        // Calculate the discount amount
        const discountAmount = (totalPrice * coupon.discountPercentage) / 100;

        // Check if a maximum discount applies
        const maxDiscount = coupon.maxDiscount;  // Assuming maxDiscountAmount is a field in the Coupon model
        const finalDiscount = maxDiscount && discountAmount > maxDiscount ? maxDiscount : discountAmount;

        // Calculate the new total price after discount
        const newTotalPrice = totalPrice - finalDiscount;

        // Update the cart with the discounted price and applied coupon
        cart.total_price = newTotalPrice;
        cart.appliedCoupon = {
            code: couponCode,
            discount: finalDiscount
        };
        await cart.save();

        // Return the response
        return res.json({
            success: true,
            message: 'Coupon applied successfully',
            discountAmount: finalDiscount,
            newTotalPrice,
            originalPrice: totalPrice
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error. Please try again later.' });
    }
};


exports.removeCoupon = async (req, res) => {
    const { cartId } = req.body;

    try {
        const cart = await Cart.findById(cartId);
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found.' });
        }

        // Remove the applied coupon
        cart.appliedCoupon = undefined;
        
        // Recalculate the total price without the coupon discount
        let totalPrice = 0;
        for (const item of cart.items) {
            const product = await Product.findById(item.product).populate('variants.offer');
            const variant = product.variants.find(v => v._id.toString() === item.variantId);
            if (variant) {
                const priceToUse = variant.offer && variant.offer.offerPercentage
                    ? variant.discount_price
                    : variant.price;
                totalPrice += priceToUse * item.quantity;
            }
        }

        cart.total_price = totalPrice;
        await cart.save();

        return res.json({
            success: true,
            message: 'Coupon removed successfully',
            newTotalPrice: totalPrice
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
    }
};




exports.acceptReturn = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }

        // Update order's return status
        order.returnStatus = 'Accepted';
        order.returnAcceptedDate = new Date();

        let refundProcessed = false;

        // Check the payment method used for the order
        if (order.paymentMethod === 'Cash on Delivery' || order.paymentMethod === 'Bank Transfer') {
            let wallet = await Wallet.findOne({ userId: order.user });

            if (!wallet) {
                wallet = new Wallet({
                    userId: order.user,
                    balance: 0,
                    transactions: []
                });
            }

            // Add the refund amount to the wallet balance
            wallet.balance += order.totalAmount;
            wallet.transactions.push({
                amount: order.totalAmount,
                type: 'Credit',
                description: `Refund for order ${order.orderId} (${order.paymentMethod})`,
                date: new Date()
            });

            // Save the order and wallet
            await Promise.all([order.save(), wallet.save()]);

            refundProcessed = true;
        }

        if (refundProcessed) {
            res.json({ success: true, message: 'Return request accepted and refund processed successfully.' });
        } else {
            res.status(400).json({ success: false, message: 'Refund process failed. Unsupported payment method.' });
        }
    } catch (error) {
        console.error('Error accepting return request:', error);
        res.status(500).json({ success: false, message: 'Error accepting return request.' });
    }
};

// Add this function to your existing exports
exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
       

        const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
        if (!order) {
          
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const generated_signature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');


        if (generated_signature === razorpay_signature) {
            order.paymentStatus = 'Paid';
            order.orderStatus = 'Processing';
            order.razorpayPaymentId = razorpay_payment_id;
            order.razorpaySignature = razorpay_signature;
            await order.save();
            res.json({ success: true, message: 'Payment verified successfully' });
        } else {
            order.paymentStatus = 'Failed';
            order.orderStatus = 'Payment Failed';
            await order.save();
            res.status(400).json({ success: false, message: 'Payment verification failed' });
        }
    } catch (error) {
        console.error('Error in verify-payment:', error);
        res.status(500).json({ success: false, message: 'Error verifying payment', error: error.message });
    }
};


// Add this function to handle payment failures
exports.handlePaymentFailure = async (req, res) => {
    try {
        const { razorpay_order_id } = req.body;
        const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
        if (!order) {
           
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Update order status to payment failed
        order.paymentStatus = 'Failed';
        order.orderStatus = 'Payment Failed';
        await order.save();

        
        res.json({ success: true, message: 'Payment failure recorded' });
    } catch (error) {
        console.error('Error handling payment failure:', error);
        res.status(500).json({ success: false, message: 'Error handling payment failure', error: error.message });
    }
};

// Add this new method to your cartcontroller.js
exports.getAvailableCoupons = async (req, res) => {
    try {
        const currentDate = new Date();
        const coupons = await Coupon.find({
            isDeleted: false,
            couponStartDate: { $lte: currentDate },
            couponEndDate: { $gte: currentDate }
        }).select('couponCode description discountPercentage');

        res.json(coupons);
    } catch (error) {
        console.error('Error fetching available coupons:', error);
        res.status(500).json({ message: 'Error fetching coupons' });
    }
};











