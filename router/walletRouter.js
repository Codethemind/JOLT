const express = require('express');
const router = express.Router();
const Wallet = require('../models/walletCollection');
const userauth = require("../middleware/userauth");
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

router.post('/add-funds', userauth, async (req, res) => {
  try {
    const { amount } = req.body;
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: "INR",
      receipt: "order_rcptid_" + Date.now(),
    };
    const order = await razorpay.orders.create(options);
    res.json({ orderId: order.id, amount: order.amount / 100 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating Razorpay order' });
  }
});

router.post('/verify-payment', userauth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      const order = await razorpay.orders.fetch(razorpay_order_id);
      const amountInRupees = order.amount / 100;

      let wallet = await Wallet.findOne({ userId: req.session.user });
      if (!wallet) {
        wallet = new Wallet({ userId: req.session.user });
      }

      wallet.balance += amountInRupees;
      wallet.transactions.push({
        amount: amountInRupees,
        type: 'Credit',
        description: 'Added money to wallet',
        date: new Date()
      });

      await wallet.save();

      res.json({ success: true, newBalance: wallet.balance });
    } else {
      res.status(400).json({ success: false, message: "Invalid signature" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
});

module.exports = router;