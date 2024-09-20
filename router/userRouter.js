const express=require('express')
const userRouter=express.Router()
const Product=require('../models/poductcollection')
const userauth=require('../middleware/userauth')



const {get_interface,get_home,get_wishlist,get_cart,get_about, get_contact, get_faq, get_error, post_signup, post_login, post_verify_otp, post_resend_otp, get_productpage, get_singleproduct, category, getlogout}=require('../controllers/userController')



userRouter.get("/",get_interface )
  userRouter.get("/home",userauth,get_home );
  userRouter.get("/wishlist",userauth, get_wishlist);
  userRouter.get("/cart",userauth,get_cart );
  userRouter.get("/about",userauth,get_about );
  userRouter.get("/contact",userauth, get_contact);
  userRouter.get("/faq",userauth, get_faq);
  userRouter.get("/error",userauth, get_error);
  userRouter.post("/signup",post_signup);
  userRouter.post("/login",post_login);
  userRouter.post("/verify-otp",post_verify_otp);
  userRouter.post('/resend-otp',post_resend_otp );
  userRouter.get('/productpage',userauth,get_productpage);
  userRouter.get('/product',userauth, get_singleproduct);
userRouter.get('/category/:id',userauth,category)
userRouter.get('/logout',getlogout)
 

 
  

  
  
  





module.exports=userRouter;