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
    
    const { couponName, couponCode, discountPercentage, couponStartDate, couponEndDate } = req.body;
 console.log(req.body);
 
    // Ensure couponCode is not empty
    if (!couponCode || couponCode.trim() === "") {
        return res.status(400).json({ success: false, message: 'Coupon Code is required' });
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
            couponStartDate: new Date(couponStartDate),
            couponEndDate: new Date(couponEndDate),
        });
console.log(6354);

        // Save coupon to the database
        await newCoupon.save();

        // Send success response
        res.status(200).json({ success: true, message: 'Coupon created successfully' });
    } catch (error) {
        console.error('Error creating coupon:', error.message);

        // Send error response
        res.status(500).json({ success: false, message: `Error creating coupon: ${error.message}` });
    }
};



// Edit/Update a coupon
exports.updateCoupon = async (req, res) => {
    const { id } = req.params;
    const { couponName, couponCode, discountPercentage, couponStartDate, couponEndDate } = req.body;

    try {
        await Coupon.findByIdAndUpdate(id, {
            couponName,
            couponCode,
            discountPercentage,
            couponStartDate,
            couponEndDate,
        });
        res.redirect('/coupons');
    } catch (error) {
        res.status(500).send('Error updating coupon');
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
