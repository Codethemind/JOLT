const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'user'
    },
    address: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Address'
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Products'
        },
        variantId: {
            type: String
        },
        quantity: {
            type: Number,
            required: true,
            default: 1
        },
        price: {
            type: Number,
            required: true
        },
        discount_price: {
            type: Number
        },
        offerPercentage: {
            type: Number,
            default: 0
        }
    }],
    paymentMethod: {
        type: String,
        required: true,
        enum: ['Cash on Delivery', 'Bank Transfer']
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0.01
    },
    discountAmount: {
        type: Number, // New field to store the discount amount
        default: 0
    },
    couponCode: {
        type: String, // New field to store the applied coupon code
        default: null
    },
    orderStatus: {
        type: String,
        required: true,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']
    },
    orderStatusTimestamps: {
        pending: { type: Date },
        processing: { type: Date },
        shipped: { type: Date },
        delivered: { type: Date },
        cancelled: { type: Date }
    },
    returnStatus: {
        type: String,
        enum: ['None', 'Pending', 'Accepted', 'Rejected'],
        default: 'None' // Default value when no return has been initiated
    },
    returnRequestDate: {
        type: Date // Date when return request was made
    },
    returnAcceptedDate: {
        type: Date // Date when return request was accepted
    },
    returnRejectedDate: {
        type: Date // Date when return request was rejected
    },
    placedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
