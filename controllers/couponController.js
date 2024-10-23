// controllers/couponController.js

const Coupon = require('../models/coupencollection');

// Get all coupons
exports.getAllCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find();
        res.render('admin_coupenmanagement', { coupons });
    } catch (error) {
        res.status(500).send('Server Error');
    }
};

exports.createCoupon = async (req, res) => {
    const { couponName, couponCode, discountPercentage, maxDiscount, couponStartDate, couponEndDate } = req.body;

    // Ensure required fields are provided
    if (!couponName || couponName.trim() === "") {
        return res.status(400).json({ success: false, message: 'Coupon Name is required.' });
    }

    if (!couponCode || couponCode.trim() === "") {
        return res.status(400).json({ success: false, message: 'Coupon Code is required.' });
    }

    if (discountPercentage < 1 || discountPercentage > 100 || isNaN(discountPercentage)) {
        return res.status(400).json({ success: false, message: 'Discount Percentage must be a number between 1 and 100.' });
    }

    if (maxDiscount <= 0 || isNaN(maxDiscount)) {
        return res.status(400).json({ success: false, message: 'Maximum Discount must be a positive number.' });
    }

    const couponStartDateObj = new Date(couponStartDate);
    const couponEndDateObj = new Date(couponEndDate);

    // Validate dates
    if (isNaN(couponStartDateObj.getTime()) || isNaN(couponEndDateObj.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid date format.' });
    }

    if (couponStartDateObj >= couponEndDateObj) {
        return res.status(400).json({ success: false, message: 'Start date must be before the end date.' });
    }

    try {
        // Check if couponCode already exists in the database
        const existingCoupon = await Coupon.findOne({ couponCode });
        if (existingCoupon) {
            return res.status(400).json({ success: false, message: 'Coupon code already exists. Please use a different code.' });
        }

        // Create new coupon object
        const newCoupon = new Coupon({
            couponName,
            couponCode,
            discountPercentage,
            maxDiscount, // Save maxDiscount
            couponStartDate: couponStartDateObj,
            couponEndDate: couponEndDateObj,
        });

        // Save coupon to the database
        await newCoupon.save();

        // Send success response
        res.status(201).json({ success: true, message: 'Coupon created successfully', coupon: newCoupon });
    } catch (error) {
        console.error('Error creating coupon:', error.message);
        // Send error response
        res.status(500).json({ success: false, message: `Error creating coupon: ${error.message}` });
    }
};





// Edit/Update a coupon
exports.updateCoupon = async (req, res) => {
    const { id } = req.params;
    const { couponName, couponCode, discountPercentage, maxDiscount, couponStartDate, couponEndDate } = req.body;

    // Validate input
    if (!couponName || couponName.trim() === "") {
        return res.status(400).json({ success: false, message: 'Coupon Name is required.' });
    }

    if (!couponCode || couponCode.trim() === "") {
        return res.status(400).json({ success: false, message: 'Coupon Code is required.' });
    }

    if (discountPercentage < 1 || discountPercentage > 100 || isNaN(discountPercentage)) {
        return res.status(400).json({ success: false, message: 'Discount Percentage must be a number between 1 and 100.' });
    }

    if (maxDiscount < 0 || isNaN(maxDiscount)) {
        return res.status(400).json({ success: false, message: 'Maximum Discount must be a non-negative number.' });
    }

    const couponStartDateObj = new Date(couponStartDate);
    const couponEndDateObj = new Date(couponEndDate);

    // Validate dates
    if (isNaN(couponStartDateObj.getTime()) || isNaN(couponEndDateObj.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid date format.' });
    }

    if (couponStartDateObj > couponEndDateObj) {
        return res.status(400).json({ success: false, message: 'Start date must be before or equal to the end date.' });
    }

    try {
        // Update the coupon
        const updatedCoupon = await Coupon.findByIdAndUpdate(id, {
            couponName,
            couponCode,
            discountPercentage,
            maxDiscount,
            couponStartDate: couponStartDateObj,
            couponEndDate: couponEndDateObj,
        }, { new: true, runValidators: true });

        if (!updatedCoupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found.' });
        }

        res.status(200).json({ success: true, message: 'Coupon updated successfully', coupon: updatedCoupon });
    } catch (error) {
        console.error('Error updating coupon:', error.message);
        res.status(500).json({ success: false, message: `Error updating coupon: ${error.message}` });
    }
};



// Soft delete a coupon (mark as deleted)
exports.deleteCoupon = async (req, res) => {
    const { id } = req.params;

    try {
        await Coupon.findByIdAndUpdate(id, { isDeleted: true });
        res.redirect('/coupons');
    } catch (error) {
        res.status(500).send('Error deleting coupon');
    }
};

// Restore a deleted coupon
exports.restoreCoupon = async (req, res) => {
    const { id } = req.params;

    try {
        await Coupon.findByIdAndUpdate(id, { isDeleted: false });
        res.redirect('/coupons');
    } catch (error) {
        res.status(500).send('Error restoring coupon');
    }
};




