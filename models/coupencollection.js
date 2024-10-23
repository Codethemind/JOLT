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
        min: 1,
        max: 100,
    },
    maxDiscount: {
        type: Number,
        default: 0, // Default value, adjust based on your needs
    },
    couponStartDate: {
        type: Date,
        required: true,
        index: true,
    },
    couponEndDate: {
        type: Date,
        required: true,
        index: true,
        validate: {
            validator: function (value) {
                return !this.couponStartDate || this.couponStartDate <= value;
            },
            message: 'End date must be after or equal to the start date.'
        },
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true }); // Automatically add createdAt and updatedAt

// Custom method to check if a coupon is valid
couponSchema.methods.isValid = function () {
    const today = new Date();
    return this.couponStartDate <= today && this.couponEndDate >= today && !this.isDeleted;
};

module.exports = mongoose.model('Coupon', couponSchema);
