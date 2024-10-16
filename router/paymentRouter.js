const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/ordercollection');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create Order
router.post('/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR' } = req.body;
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency,
      receipt: `order_${Date.now()}`, // Unique receipt ID
    };

    // Create the order in Razorpay
    const order = await razorpay.orders.create(options);

    // Check if an order with the same razorpayOrderId already exists in your database
    const existingOrder = await Order.findOne({ razorpayOrderId: order.id });
    if (existingOrder) {
      // If the order already exists, return it instead of creating a new one
      return res.status(409).json({ message: 'Order already exists', order: existingOrder });
    }

    // Create a new order in your database
    const newOrder = new Order({
      razorpayOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      status: 'pending', // Set status as pending
      // Add other necessary fields from the request body
    });

    // Save the new order to the database
    await newOrder.save();

    res.status(201).json(newOrder); // Respond with the created order
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating order' });
  }
});

// Verify Payment
router.post('/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    console.log('Received verification request:', { razorpay_order_id, razorpay_payment_id, razorpay_signature });

    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generated_signature === razorpay_signature) {
      // Find the order by its Razorpay order ID
      let order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
      
      if (!order) {
        console.log(`Order not found for razorpayOrderId: ${razorpay_order_id}`);
        // Try to find the order by other means, e.g., the most recent pending order for the user
        order = await Order.findOne({ 
          user: req.session.user, 
          orderStatus: 'Pending',
          paymentMethod: 'Bank Transfer'
        }).sort({ createdAt: -1 });

        if (!order) {
          console.log('No matching pending order found');
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

        // Update the order with the Razorpay order ID
        order.razorpayOrderId = razorpay_order_id;
      }

      // Update the order status
      order.status = 'paid';
      order.razorpayPaymentId = razorpay_payment_id;
      order.razorpaySignature = razorpay_signature;
      await order.save();
      
      console.log(`Order ${order._id} updated successfully`);
      res.json({ success: true, message: 'Payment verified successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid signature' });
    }
  } catch (error) {
    console.error('Error in verify-payment:', error);
    res.status(500).json({ success: false, message: 'Error verifying payment', error: error.message });
  }
});

module.exports = router;
