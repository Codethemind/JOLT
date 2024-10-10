const User = require('../models/usercollection'); 
const Otp = require('../models/otpcollection'); 
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt'); 

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Email not found.' });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 3600000; 
    await Otp.create({ email, otp, otpExpiry });
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP Code for Password Reset',
      text: `Your OTP code is ${otp}. It is valid for 1 hour.`,
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' });
      } else {
        res.json({ success: true, message: 'OTP sent to your email.' });
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
};

exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const otpRecord = await Otp.findOne({ email, otp });
    if (!otpRecord || otpRecord.otpExpiry < Date.now()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }
    res.json({ success: true, message: 'OTP verified successfully. You can now reset your password.' });
    await Otp.deleteOne({ email, otp });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Email not found.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10); 
    user.password = hashedPassword;
    await user.save();
    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
};
