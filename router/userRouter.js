const express=require('express')
const userRouter=express.Router()
const {get_interface,get_home,get_wishlist,get_cart,get_about, get_contact, get_faq, get_error, post_signup, post_login, post_verify_otp, post_resend_otp}=require('../controllers/userController')



// const userauth=require('../middleware/userauth')


// userRouter.use(checksession)

userRouter.get("/",get_interface )
  userRouter.get("/home",get_home );
  userRouter.get("/wishlist", get_wishlist);
  userRouter.get("/cart",get_cart );
  userRouter.get("/about",get_about );
  userRouter.get("/contact", get_contact);
  userRouter.get("/faq", get_faq);
  userRouter.get("/error", get_error);
  userRouter.post("/signup", post_signup);
  userRouter.post("/login", post_login);
  userRouter.post("/verify-otp", post_verify_otp);
  userRouter.post('/resend-otp',post_resend_otp );
  
  
  





module.exports=userRouter;