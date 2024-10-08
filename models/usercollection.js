const mongoose=require('mongoose')

const userschema=mongoose.Schema({
  name:{
    type:String,
   
  },email:{
    type:String,
    required:true
  },
  password:{
    type:String,
    
  },
  isAdmin:{
    type:Boolean,
    default:false
  },
  isBlock:{
    type:Boolean,
    default:false
  },
  usedCoupons: [String]
})

const user=mongoose.model('user',userschema);

module.exports=user;