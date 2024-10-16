const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
    brand_name: String,
    totalSales: {
        type: Number,
        default: 0  // Tracks how many units of all products under this brand have been sold
    },
    isDeleted:{
        type:Boolean,
        default:false
    }
   },{
      timestamps:true
});

const brand = mongoose.model('Brand',brandSchema)
module.exports=brand