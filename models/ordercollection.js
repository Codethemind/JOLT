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
        type: Number,
        default: 0
    },
    couponCode: {
        type: String,
        default: null
    },
    orderStatus: {
        type: String,
        required: true,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Payment Failed', 'Retrying Payment'],
        default: 'Pending'
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Failed'],
        default: 'Pending'
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    placedAt: {
        type: Date,
        default: Date.now
    },
    // Add return-related fields
    returnStatus: {
        type: String,
        enum: ['None', 'Pending', 'Accepted', 'Rejected'],
        default: 'None'
    },
    returnRequestDate: {
        type: Date
    },
    returnAcceptedDate: {
        type: Date
    },
    returnRejectedDate: {
        type: Date
    },
    returnReason: {
        type: String
    },
    returnDescription: {
        type: String
    }

}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
