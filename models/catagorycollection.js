const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true // Ensure category names are unique
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