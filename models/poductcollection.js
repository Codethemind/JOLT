const mongoose = require('mongoose');

// Define the schema for Products
const productSchema = new mongoose.Schema({
    product_name: String,
    sold: {
        type: Number,
        default: 0  // Tracks how many units of this product have been sold
    },
    product_highlights: {
        type: String,
        required: true
    },
    category_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
    },
    brand_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Brand',
        required: true,
    },
    product_description: {
        type: String,
        required: true
    },
    isDelete: {
        type: Boolean,
        default: false
    },
    variants: [{
        price: {
            type: Number,
            required: true,
        },
        discount_price:{
            type:Number,
            default:0
        },
        offer:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Offer'
        },
        size: {
            type: String,
            default: null,
            required: true,
        },
        stock: {
            type: Number,
            required: true,
        },
        color: {
            type: String,
            required: true
        },
        images: [{ 
            type: String,
            required: false
        }]
    }],
    sold: {
        type: Number,   // Used for sorting by popularity
        default: 0
    },
    averageRating: {
        type: Number,   // For sorting by ratings
        default: 0
    },
    featured: {
        type: Boolean,  // Used for "Featured" sorting
        default: false
    }
}, { timestamps: true });

// Create and export the model
const Products = mongoose.model('Products', productSchema);
module.exports = Products;
