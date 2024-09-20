const user =require('../models/usercollection')
const OTP =require('../models/otpcollection')
const Category =require('../models/catagorycollection')
const Product=require('../models/poductcollection')


const bcrypt=require('bcrypt')
const path = require("path");
const otpGenerator = require("otp-generator");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const otps = {};

const get_interface= (req, res) => {
    res.render("interface");
  }


  const get_home = async (req, res) => {
    const categoryId = req.query.category; // Get category ID from query

    let query = {}; // Default to an empty query to fetch all products

    if (categoryId) {
        query = { category_id: categoryId }; // If a category is selected, filter products by category
    }

    // Fetch products with category and brand populated
    const product = await Product.find(query,{isDelete:false}).populate('category_id').populate('brand_id');

    // Fetch all categories for the navigation bar
    const categories = await Category.find({ isDeleted: false });

    // Render the home page, passing categories, products, and the selected category
    const top = await Product.find({'variants.stock': { $lt: 4 },isDelete:false});

    const category = await Category.findOne({ name: 'Cameras' }).exec();
    if (!category) {
      throw new Error('Category not found');
    }
    const categoryId1 = category._id;
    const onsale = await Product.find({ category_id: categoryId1,isDelete:false }).populate('category_id').exec();

    
    

            res.render("home", {
        categories,       // All available categories
        product, 
        top, 
        onsale,        // Filtered or all products
        queryCategory: categoryId // The selected category ID, if any
    });
};

  
  

  const get_wishlist=(req, res) => {
    res.render("wishlist");
  }

  const get_cart=(req, res) => {
    res.render("cart");
  }
  const get_about=(req, res) => {
    res.render("about");
  }
  const get_contact=(req, res) => {
    res.render("contact");
  }
  const get_faq=(req, res) => {
    res.render("faq");
  }
  const get_error=(req, res) => {
    res.render("error");
  }
  


  const post_signup=async (req, res) => {
    const { name, email, password } = req.body;
    try {
      console.log(64);
      
      const existingUser = await user.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: "This email already exists" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new user({
        name,
        email,
        password: hashedPassword,
      });
      const otp = otpGenerator.generate(6, {
        digits: true,        // Allow digits (numeric values)
        specialChars: false,  // Disable special characters
        upperCase: false,     // Disable uppercase letters
        lowerCaseAlphabets: false,  // Disable lowercase letters
        upperCaseAlphabets: false   // Disable uppercase letters (extra safety)
      });
      const otpmodel = new OTP({ otp: otp, email: email });
      await otpmodel.save();
      req.session.email = email;
      req.session.newUser = newUser;
      const mailOptions = {
        from: "mhdshahid88gmail.com",
        to: email,
        subject: "OTP for registration",
        text: `Your OTP for registration is: ${otp}`,
      };
      await transporter.sendMail(mailOptions);
      return res.status(200).json({
        success: true,
        successRedirectUrl: "#otp-modal",
      });
    } catch (error) {
      console.error("Error during signup:", error);
      return res.status(500).json({ error: "An error occurred during signup" });
    }
  }

  const post_login=async (req, res) => {
    try {
      // Find the user by email
      const userRecord = await user.findOne({ email: req.body.email });
      if (!userRecord) {
        return res.status(404).json({ error: "User not found" });
      }
     
      if(userRecord.isBlock){
        return res.status(404).json({ error: "User blocked" });
      }
      // Compare the provided password with the hashed password in the database
      const isPasswordValid = await bcrypt.compare(req.body.password,userRecord.password);
      if (isPasswordValid) {
        req.session.username=true;
        // Password is correct, redirect to the home page
        return res.status(200).json({ success: true,successRedirectUrl: "/home", });
      } else {
        return res.status(401).json({ error: "Incorrect password" });
      }
    } catch (error) {
      console.error("Login error:", error); // Log detailed error
      return res.status(500).json({ error: "An error occurred during login" });
    }
  }


  const post_verify_otp = async (req, res) => {
    try {
      const { otp } = req.body;
      const newUserData = req.session.newUser;
      const email = req.session.email;
  
      // Validate session data
      if (!newUserData || !email) {
        return res.status(400).json({ error: "Session data missing or expired" });
      }
  
      // Find the OTP record
      const otpcheck = await OTP.findOne({ email });
  
      if (!otpcheck) {
        return res.status(400).json({ error: "Invalid OTP" });
      }
  
      // Check if OTP matches and is for the correct email
      if (otpcheck.otp === otp && otpcheck.email === email) {
        // Create new user and save to database
        const newUser = new user(newUserData);
        await newUser.save();
  
        // Optionally, you might want to delete or invalidate the OTP record
        // await OTP.deleteOne({ email });
  
        return res.status(200).json({
          success: true,
          successRedirectUrl: "#login-form",
        });
      } else {
        return res.status(400).json({ error: "Invalid OTP or email" });
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      return res.status(500).json({ error: "An error occurred while verifying OTP" });
    }
  };
  

  const post_resend_otp = async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
  
    try {
      const otp = otpGenerator.generate(6, {
        digits: true,
        upperCase: false,
        specialChars: false,
        alphabets: false,
      });
      console.log('Generated OTP:', otp);
  
      // Find if an OTP record exists for the email
      const otpRecord = await OTP.findOne({ email });
  
      if (otpRecord) {
        // Update the existing OTP record
        await OTP.updateOne({ email }, { otp });
      } else {
        // Insert a new OTP record if one doesn't exist
        await OTP.create({ email, otp });
      }
  
      const mailOptions = {
        from: "your-email@gmail.com",
        to: email,
        subject: "OTP for registration",
        text: `Your OTP for registration is: ${otp}`,
      };
  
      // Send OTP email
      await transporter.sendMail(mailOptions);
  
      console.log('OTP resent to email:', email);
      res.json({ success: true });
    } catch (error) {
      console.error('Error resending OTP:', error);
      res.status(500).json({ error: 'Failed to resend OTP' });
    }
  };

  const get_productpage=async (req,res)=>{
    const product=await Product.find({isDelete:false})
    res.render('productpage',{product})
  }
  
  const get_singleproduct=async(req,res)=>{
    const id = req.query.id
    const product = await Product.findOne({_id:id,isDelete:false}).populate('category_id')
    const category = product.category_id;
    const relatableProduct = await Product.find({category_id:category,isDelete:false})
    res.render('singleproduct',{product,relatableProduct,category})
  }


 const category = async (req, res) => {
    const id = req.params.id;

    try {
        // Fetch products by category ID
        const products = await Product.find({ category_id: id ,isDelete:false}).populate('category_id');
        
        // Fetch the category by ID
        const category = await Category.findById(id);

        if (!category) {
            return res.status(404).send('Category not found');
        }

        res.render('category', {
            products,  // List of products
            category   // Single category object
        });
    } catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).send('Server Error');
    }
};

const getlogout=(req,res)=>{
  req.session.destroy(err=>{
    if(err){
      console.log(err);
    }else{
      res.redirect('/')
    }
  })
}



  module.exports={get_interface, get_home,get_wishlist,get_cart,get_about,get_contact,get_faq,get_error,post_signup,post_login,post_verify_otp,post_resend_otp,get_productpage,get_singleproduct,category,getlogout};