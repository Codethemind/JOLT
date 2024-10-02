const mongoose = require('mongoose');

// Define the schema for Products
const productSchema = new mongoose.Schema({
    product_name: {
        type: String,
        required: true,
        unique: true,
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
