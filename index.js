const express = require("express");
const path = require("path");
const app = express();
const session = require("express-session");
const nocache = require("nocache");
const mongoose = require("mongoose");

require('dotenv').config();
const passport = require("./config/passport")
const userRouter = require('./router/userRouter');
const googleRouter = require('./router/googleRouter')
const adminRouter = require('./router/adminRouter')
const brandRouter = require('./router/brandRouter')
const profileRouter = require('./router/profileRouter');
const cartRouter = require('./router/cartRouter')
const wishlistRouter = require('./router/wishlistRouter');
const coupenRouter = require('./router/coupenRouter');
const otpRouter = require('./router/otpRouter');
const paymentRouter = require('./router/paymentRouter');
const walletRouter = require('./router/walletRouter');
const returnRouter = require('./router/returnRouter')
const reportRouter = require('./router/reportRouter');

mongoose.connect("mongodb://127.0.0.1:27017/JOLT")
app.use('/uploads',express.static('uploads'))
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(nocache());
app.use(session({ secret: "nothg", resave: false, saveUninitialized: false }));
app.use(passport.initialize())
app.use(passport.session())
app.set('views', path.join(__dirname, 'views'));
app.set("view engine", "ejs");
app.use('/user', userRouter)
app.use('/auth', googleRouter)
app.use('/admin', adminRouter)
app.use('/brand', brandRouter)
app.use('/profile', profileRouter)
app.use('/api/cart', cartRouter);
app.use('/wishlist', wishlistRouter);
app.use('/coupons', coupenRouter);
app.use('/api/otp', otpRouter);
app.use('/payments', paymentRouter);
app.use('/wallet', walletRouter);
app.use('/return', returnRouter);
app.use('/admin/reports', reportRouter);

app.use((req, res, next) => {
    res.locals.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
    next();
});

app. get('/',(req,res)=>{
  res.redirect('/user/')
})
app.get('/*',(req,res)=>{
  res.render('error')
})

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


