const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    couponName: {
        type: String,
        required: true,
    },
    couponCode: {
        type: String,
        required: true,
        unique: true,
    },
    discountPercentage: {
        type: Number,
        required: true,
    },
    couponStartDate: {
        type: Date,
        required: true,
    },
    couponEndDate: {
        type: Date,
        required: true,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
});

module.exports = mongoose.model('Coupon', couponSchema);
