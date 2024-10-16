const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: String,
  totalSales: {
      type: Number,
      default: 0  // Tracks how many units of all products in this category have been sold
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  offer:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'Offer'
}
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;