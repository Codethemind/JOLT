const User = require('../models/usercollection'); // Adjust the path to your User model
const Otp = require('../models/otpcollection'); // Adjust the path to your OTP model
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const e = require('express');


// Setup Nodemailer
// Function to generate a random OTP
const randomOtp = () => Math.floor(100000 + Math.random() * 900000).toString(); // Generates a 6-digit OTP

// Function to send OTP via email
const sendEmail = async (email, otp) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Replace with your email service
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: 'your-email@gmail.com',
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP code is: ${otp}`,
    };

    return transporter.sendMail(mailOptions);
};


exports.postProfileEdit = async (req, res) => {
    try {
        const { name, email } = req.body;
        const userId = req.session.user; // Assuming user ID is stored in req.session.user

        // Check if the email already exists for another user
        const existingUser = await User.findOne({ email: email, _id: { $ne: userId } });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        await User.findByIdAndUpdate(userId, { name, email });
        res.status(200).json({ message: 'Profile updated successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to update profile.' });
    }
}


exports.postPasswordChange= async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.session.user;

        // Check if both fields are provided
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Both current and new passwords are required.' });
        }
        // Check if userId exists in session
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated.' });
        }

        // Fetch the user from the database
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Verify the current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect.' });
        }

        // Hash the new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Update the user's password
        await User.findByIdAndUpdate(userId, { password: hashedNewPassword });

        // Send a success response
        res.status(200).json({ message: 'Password changed successfully!' });
    } catch (error) {
        console.error("Error during password change:", error);
        res.status(500).json({ message: 'Failed to change password.' });
    }
}

exports.postSentOtp=async (req, res) => {
    const { email } = req.body;
    const userId = req.session.user ; // Adjust according to your session structure
    console.log(userId);
    
        if (!email || !userId) {
            return res.status(400).json({ message: 'Email and user ID are required.' });
        }

    if (!email) {
        return res.status(400).json({ message: 'Email is required.' });
    }

    const generatedOtp = randomOtp(); // Generate OTP

    try {
        // Save the OTP document
       

        const otpDocument = new Otp({ email,userId, otp: generatedOtp });
        await otpDocument.save();

        // Send the OTP email
        await sendEmail(email, generatedOtp);

        return res.status(200).json({ message: 'OTP has been sent to your email.' });
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ message: 'Failed to send OTP.' });
    }
}

exports.postResetPassword=async (req, res) => {
    try {
        console.log("Request Body:", req.body);

        const { otpCode, newPassword } = req.body;
        console.log("OTP Code:", otpCode);

        const otpEntry = await Otp.findOne({ otp: otpCode });
        console.log("OTP Entry:", otpEntry);

        if (!otpEntry) {
            return res.status(400).json({ message: 'Invalid OTP.' });
        }

        const userId = req.session.user; // Retrieve userId from otpEntry
        console.log("User ID from OTP Entry:", userId);

        if (!userId) {
            return res.status(400).json({ message: 'User ID not found in OTP entry.' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await User.findByIdAndUpdate(user._id, { password: hashedNewPassword });

        res.status(200).json({ message: 'Password reset successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to reset password.' });
    }
}