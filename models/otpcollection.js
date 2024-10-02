const mongoose = require('mongoose');

const otpschema = mongoose.Schema({
  otp: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
 
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 30 // This will make the document expire 30 seconds after creation
  }
});

otpschema.index({ createdAt: 1 }, { expireAfterSeconds: 30 });

const OTP = mongoose.model('OTP', otpschema);

module.exports = OTP;
