const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    referralBonus: {
        type: Number,
        default: 100 // Default referral bonus amount
    }
});

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
