const Product = require('../models/poductcollection');
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
        let cart = await Cart.findOne({ user: req.session.user });
        if (!cart) {
            cart = new Cart({ user: req.session.user, items: [], total_price: 0 });
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
        res.status(500).json({ message: 'Server error' });
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
        if (!req.session.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        
        const { addressId, paymentMethod } = req.body;

        // Update the populate to include the offer
        const cart = await Cart.findOne({ user: req.session.user }).populate({
            path: 'items.product',
            populate: {
                path: 'variants',
                populate: {
                    path: 'offer'
                }
            }
        });

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: "Cart is empty" });
        }

        let subtotal = 0;
        let totalDiscount = 0;
        
        for (const item of cart.items) {
            const product = item.product; // No need to fetch again, it's already populated
            const variant = product.variants.find(v => v._id.toString() === item.variantId);

            if (variant) {
                if (variant.stock < item.quantity) {
                    return res.status(400).json({ message: `Insufficient stock for ${product.product_name}` });
                }
                variant.stock -= item.quantity;
                await product.save();

                const regularPrice = variant.price * item.quantity;
                let finalPrice = regularPrice;

                if (variant.offer && variant.offer.offerPercentage > 0) {
                    finalPrice = variant.discount_price * item.quantity;
                    totalDiscount += (regularPrice - finalPrice);
                }

                subtotal += regularPrice;
                item.finalPrice = finalPrice / item.quantity;
            }
        }

        let couponDiscount = 0;
        if (cart.appliedCoupon && cart.appliedCoupon.discount) {
            couponDiscount = cart.appliedCoupon.discount;
            totalDiscount += couponDiscount;
        }

        let totalAmount = Math.max(0, subtotal - totalDiscount);
        totalAmount = Math.round(totalAmount * 100) / 100;

        if (isNaN(totalAmount) || totalAmount < 0) {
            throw new Error('Invalid total amount calculated');
        }

        const newOrderId = generateOrderId();
        
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
            couponCode: cart.appliedCoupon ? cart.appliedCoupon.code : null,
            discountAmount: couponDiscount,
            orderStatus: 'Pending',
            orderStatusTimestamps: {
                pending: new Date()
            }
        });

        if (paymentMethod === 'Bank Transfer') {
            const razorpayOrder = await razorpay.orders.create({
                amount: Math.round(totalAmount * 100),
                currency: 'INR',
                receipt: newOrderId,
            });
            
            return res.status(200).json({
                message: "Razorpay order created",
                razorpayOrder: razorpayOrder,
                order: newOrder
            });
        } else if (paymentMethod === 'Cash on Delivery') {
            await newOrder.save();
            await Cart.deleteOne({ user: req.session.user });
  
            return res.status(201).json({ message: "Order placed successfully", order: newOrder });
        } else {
            return res.status(400).json({ message: "Invalid payment method" });
        }
    } catch (error) {
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

        // Restore stock for each item in the order
        for (const item of order.items) {
            const product = await Product.findById(item.product);
            const variant = product.variants.find(v => v._id.toString() === item.variantId);
            if (variant) {
                variant.stock += item.quantity; // Restore the stock
                await product.save();
            }
        }

        order.orderStatus = 'Cancelled';
        order.orderStatusTimestamps.cancelled = new Date();

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

exports.applycoupen = async (req, res) => {
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

        
        const hasUsedCoupon = await Order.findOne({ 
            user: userId, 
            couponCode: couponCode
        });

        if (hasUsedCoupon) {
            return res.status(400).json({ message: 'You have already used this coupon.' });
        }

        const cart = await Cart.findById(cartId).populate({
            path: 'items.product',
            populate: {
                path: 'variants.offer'
            }
        });

        if (!cart) {
            return res.status(404).json({ message: 'Cart not found.' });
        }

        
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

     
        const discountAmount = (totalPrice * coupon.discountPercentage) / 100;
        const newTotalPrice = totalPrice - discountAmount;

        cart.total_price = newTotalPrice;
        cart.appliedCoupon = {
            code: couponCode,
            discount: discountAmount
        };
        await cart.save();

        return res.json({
            success: true,
            message: 'Coupon applied successfully',
            discountAmount,
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
            return res.status(404).json({ message: 'Cart not found.' });
        }

      
        cart.appliedCoupon = undefined;
        
       
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
        return res.status(500).json({ message: 'Server error. Please try again later.' });
    }
};


exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order } = req.body;
        
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature === expectedSign) {
            const newOrder = new Order(order);
            newOrder.orderStatus = 'Pending';
            newOrder.orderStatusTimestamps.processing = new Date();
            await newOrder.save();

            await Cart.deleteOne({ user: req.session.user });

            return res.status(200).json({ message: "Payment verified and order placed successfully" });
        } else {
            return res.status(400).json({ message: "Invalid signature sent!" });
        }
    } catch (error) {
        console.error("Error verifying payment:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};