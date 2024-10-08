const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const Order = require('../models/ordercollection');
const User = require('../models/usercollection');
const cartController = require('../controllers/cartcontroller');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

router.post('/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR' } = req.body;
    const options = {
      amount: amount * 100,
      currency,
      receipt: `order_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating order' });
  }
});

router.post('/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    if (generated_signature === razorpay_signature) {
      await Order.findOneAndUpdate({ razorpayOrderId: razorpay_order_id }, { status: 'paid' });
      res.json({ success: true, message: 'Payment verified successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid signature' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error verifying payment' });
  }
});

router.post('/verify', cartController.verifyPayment);

module.exports = router;