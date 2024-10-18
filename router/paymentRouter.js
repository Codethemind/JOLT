const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/ordercollection');
const cartController = require('../controllers/cartcontroller');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

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

router.post('/verify', cartController.verifyPayment);

router.post('/retry-payment/:orderId', async (req, res) => {
  console.log('Retrying payment for order:', req.params.orderId);
  
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId: orderId });
    console.log(order);
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.paymentStatus !== 'Failed') {
      return res.status(400).json({ success: false, message: 'This order is not eligible for payment retry' });
    }

    const options = {
      amount: order.totalAmount * 100, // Amount in paise
      currency: 'INR',
      receipt: `retry_${orderId}`,
    };

    const newRazorpayOrder = await razorpay.orders.create(options);

    order.razorpayOrderId = newRazorpayOrder.id;
    order.paymentStatus = 'Paid';
    order.orderStatus = 'Processing';
    
    await order.save();

    res.json({
      success: true,
      order: {
        totalAmount: order.totalAmount,
        orderId: order.orderId
      },
      razorpayOrderId: newRazorpayOrder.id,
      customerName: order.address.fullName,
      customerEmail: req.session.user ? req.session.user.email : '',
      customerPhone: order.address.phone,
    });
  } catch (error) {
    console.error('Error retrying payment:', error);
    res.status(500).json({ success: false, message: 'Error retrying payment', error: error.message });
  }
});

router.post('/payment-failure', cartController.handlePaymentFailure);

module.exports = router;
