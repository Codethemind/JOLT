const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
    brand_name:{
        type:String,
        required:true
    },
    isDeleted:{
        type:Boolean,
        default:false
    }
   },{
      timestamps:true
});

const brand = mongoose.model('brand',brandSchema)
module.exports=brand