const mongoose = require('mongoose')

const userschema = mongoose.Schema({
  name: {
    type: String,
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  isBlock: {
    type: Boolean,
    default: false
  },
  usedCoupons: [String],
  referralCode: {
    type: String,
    unique: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  },
  referralEarnings: {
    type: Number,
    default: 0
  }
})

const user = mongoose.model('user', userschema);
module.exports = user;
