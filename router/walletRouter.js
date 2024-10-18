const express = require('express');
const router = express.Router();
const Wallet = require('../models/walletCollection');
const userauth = require("../middleware/userauth");
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});


router.post('/add-funds', userauth, async (req, res) => {
    try {
        const { amount } = req.body;

        // Validate amount
        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        // Create Razorpay order
        const options = {
            amount: amount * 100, // Razorpay expects amount in paise
            currency: "INR",
            receipt: "order_rcptid_" + Date.now(),
        };
        const order = await razorpay.orders.create(options);

        res.json({ orderId: order.id, amount: order.amount / 100, keyId: process.env.RAZORPAY_KEY_ID });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creating Razorpay order' });
    }
});

router.post('/verify-payment', userauth, async (req, res) => {
  try {
    console.log('Received payment verification request:', req.body);

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Validate payment signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      console.log('Invalid signature');
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    // Fetch order details
    const order = await razorpay.orders.fetch(razorpay_order_id);
    const amountInRupees = order.amount / 100;

    console.log('Fetched order:', order);

    // Find or create wallet
    let wallet = await Wallet.findOne({ userId: req.session.user });
    if (!wallet) {
      console.log('Creating new wallet for user:', req.session.user);
      wallet = new Wallet({ userId: req.session.user, balance: 0 });
    }

    console.log('Current wallet balance:', wallet.balance);

    // Update wallet balance
    wallet.balance += amountInRupees;
    wallet.transactions.push({
      amount: amountInRupees,
      type: 'Credit',
      description: 'Added money to wallet',
      date: new Date()
    });

    console.log('Updated wallet:', wallet);

    // Save wallet
    await wallet.save();

    console.log('Wallet saved successfully');

    res.json({ success: true, newBalance: wallet.balance });
  } catch (error) {
    console.error('Error in verify-payment:', error);
    res.status(500).json({ success: false, message: "Something went wrong", error: error.message });
  }
});



module.exports = router;
