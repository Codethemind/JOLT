const user =require('../models/usercollection')
const Address =require('../models/adresscollection')
const Order =require('../models/ordercollection')
const OTP =require('../models/otpcollection')
const Category =require('../models/catagorycollection')
const Product=require('../models/poductcollection')
const Cart=require('../models/cartCollection')
const Wallet = require('../models/walletCollection')



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




  const get_home = async (req, res) => {
    const categoryId = req.query.category; // Get category ID from query
    let query = {}; // Default to an empty query to fetch all products
    if (categoryId) {
        query = { category_id: categoryId };}
    const product = await Product.find(query,{isDelete:false}).populate('category_id').populate('brand_id').populate('variants.offer');
    const categories = await Category.find({ isDeleted: false });
    const top = await Product.find({'variants.stock': { $lt: 4 },isDelete:false}).populate('variants.offer');
    const User =await user.findOne({_id:req.session.user})
    const cart = await Cart.findOne({ user: req.session.user }).populate('items.product');
   
    const category = await Category.findOne({ name: 'Cameras' }).exec();
    if (!category) {
      throw new Error('Category not found');
    }
    const categoryId1 = category._id;
    const onsale = await Product.find({ category_id: categoryId1,isDelete:false }).populate('category_id').populate('variants.offer').exec();
            res.render("home", {
        categories,       // All available categories
        product, 
        top, 
        onsale, 
        User,    // Filtered or all products
        queryCategory: categoryId,// The selected category ID, if any
        cart
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
  

  const post_signup = async (req, res) => {
    const { name, email, password } = req.body;

    // Check if all fields are provided
    if (!name || !email || !password) {
        return res.status(400).json({ error: "All fields are required." });
    }

    try {
        // Check if the name contains only letters and spaces
        if (!/^[a-zA-Z\s]+$/.test(name)) {
            return res.status(400).json({ error: "Name must contain only letters and spaces." });
        }

        // Check if email already exists
        const existingUser = await user.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "This email already exists." });
        }

        // Password validation
        if (password.length < 6 || /\s/.test(password)) {
            return res.status(400).json({ error: "Password must be at least 6 characters long and contain no spaces." });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new user({
            name,
            email,
            password: hashedPassword,
        });
        
        

        // Generate OTP and save it
        const otp = otpGenerator.generate(6, {
            digits: true,
            specialChars: false,
            upperCase: false,
            lowerCaseAlphabets: false,
            upperCaseAlphabets: false,
        });
        const otpmodel = new OTP({ otp: otp, email: email });
        await otpmodel.save();

        // Store user and OTP in the session
        req.session.email = email;
        req.session.newUser = newUser;

        // Send OTP email
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
};

const post_login = async (req, res) => {
  const { email, password } = req.body;

  // Server-side validation
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    // Find the user by email
    const userRecord = await user.findOne({ email });
    if (!userRecord) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the user is blocked
    if (userRecord.isBlock) {
      return res.status(403).json({ error: "User is blocked" });
    }

    // Compare the provided password with the hashed password in the database
    const isPasswordValid = await bcrypt.compare(password, userRecord.password);
    if (isPasswordValid) {
      req.session.user = userRecord._id; // Store user session

      // Password is correct, redirect to the home page
      return res.status(200).json({ success: true, successRedirectUrl: "/" });
    } else {
      return res.status(401).json({ error: "Incorrect password" });
    }
  } catch (error) {
    console.error("Login error:", error); // Log detailed error
    return res.status(500).json({ error: "An error occurred during login" });
  }
};


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
  
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error resending OTP:', error);
      res.status(500).json({ error: 'Failed to resend OTP' });
    }
  };

  const get_ProductPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Current page number
        const limit = 8; // Number of products per page
        const skip = (page - 1) * limit; // Number of products to skip

        // Get search and sort options from query parameters
        const searchQuery = req.query.search || ''; // Search term from query
        const sortOption = req.query.sort || 'new'; // Sort option from query

        let sortCriteria;

        // Define sort logic
        switch (sortOption) {
            case 'popularity':
                sortCriteria = { sold: -1 }; // Most sold products first
                break;
            case 'price-low-high':
                sortCriteria = { 'variants.price': 1 }; // Cheapest products first
                break;
            case 'price-high-low':
                sortCriteria = { 'variants.price': -1 }; // Most expensive products first
                break;
            case 'ratings':
                sortCriteria = { averageRating: -1 }; // Highest rated products first
                break;
            case 'featured':
                sortCriteria = { featured: -1, createdAt: -1 }; // Featured and newest first
                break;
            case 'a-z':
                sortCriteria = { product_name: 1 }; // Alphabetically A-Z
                break;
            case 'z-a':
                sortCriteria = { product_name: -1 }; // Alphabetically Z-A
                break;
            default:
                sortCriteria = { createdAt: -1 }; // Newest products first
        }

        // Search filter
        const searchFilter = searchQuery
            ? { product_name: { $regex: searchQuery, $options: 'i' }, isDelete: false } // Case-insensitive search
            : { isDelete: false }; // Show only products that aren't deleted

        // Get total product count for pagination
        const totalProducts = await Product.countDocuments(searchFilter).populate('variants.offer');

        // Fetch products based on search, pagination, and sort
        const products = await Product.find(searchFilter).populate('variants.offer')
            .sort(sortCriteria)
            .skip(skip)
            .limit(limit)
            .exec();

        // Fetch all categories (if needed for filters or display)
        const categories = await Category.find();

        // Calculate total number of pages
        const totalPages = Math.ceil(totalProducts / limit);

        // Check if no products found
        const noProductsFound = products.length === 0;

        // Render product page with products and pagination
        res.render('productpage', {
            products,
            categories,
            currentPage: page,
            totalPages,
            searchQuery,
            sortOption,
            noProductsFound // Pass this flag to the template
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};


  
  const get_singleproduct=async(req,res)=>{
    const id = req.query.id
    const product = await Product.findOne({_id:id,isDelete:false}).populate('category_id').populate('variants.offer')
    const category = product.category_id;
    const relatableProduct = await Product.find({category_id:category,isDelete:false}).populate('variants.offer')
    res.render('singleproduct',{product,relatableProduct,category})
  }


  const category = async (req, res) => {
    const id = req.params.id;
    
    try {
        const page = parseInt(req.query.page) || 1; // Get the current page number from query params, default to 1
        const limit = 4; // Number of products per page
        const skip = (page - 1) * limit; // Calculate how many products to skip
        
        // Fetch the total number of products for the category
        const totalProducts = await Product.countDocuments({ category_id: id, isDelete: false });
        
        // Fetch the products for the current page
        const products = await Product.find({ category_id: id, isDelete: false })
                                      .skip(skip)
                                      .limit(limit)
                                      .populate('category_id')
                                      .exec();
        
        // Fetch the category details by ID
        const category = await Category.findById(id);
        
        if (!category) {
            return res.status(404).send('Category not found');
        }
        
        // Calculate the total number of pages
        const totalPages = Math.ceil(totalProducts / limit);
        
        res.render('category', {
            products,  // List of products for the current page
            category,  // Single category object
            currentPage: page,  // Current page number
            totalPages: totalPages  // Total number of pages
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


const get_myaccount = async (req, res) => {
  try {
    if (!req.session.user) {

      return res.status(401).send('User not authenticated');
    }

    const User = await user.findById(req.session.user);
    if (!User) {
      return res.status(404).send('User not found');
    }

    let orders = await Order.find({ user: req.session.user })
  .sort({ createdAt: -1 }) // Sort by createdAt in descending order
  .populate({
    path: 'items.product',
    populate: {
      path: 'variants.offer'
    }
  })
  .populate('address');
  

    orders.forEach((order, index) => {
      order.items.forEach((item, itemIndex) => {
      });
    });
    const addresses = await Address.find({userId: req.session.user});
    const wallet = await Wallet.findOne({ userId: req.session.user });
    const walletTransactions = wallet ? wallet.transactions : [];

    res.render('myaccount', { 
      User, 
      orders, 
      addresses,
      wallet,
      walletTransactions,
      RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error('Error in get_myaccount:', error.message);
    res.status(500).send('Server Error');
  }
};



const postaddressadd=async (req, res) => {  
  const { fullName, streetAddress, city, state, zipCode, country, phone } = req.body;
  const userId = req.session.user; // Assuming userId is available here

  const newAddress = new Address({
      userId, // Set the userId
      fullName,
      streetAddress,
      city,
      state,
      zipCode,
      country,
      phone,
  });

  try {
      await newAddress.save();
      res.status(200).json({ success: true });
  } catch (error) {
      console.error('Error adding address:', error);
      res.status(500).json({ success: false });
  }
}

const postaddressedit=async (req, res) => {
  
  try {
      const addressId = req.params.id;
      const updatedAddress = {
          fullName: req.body.fullName,
          streetAddress: req.body.streetAddress,
          city: req.body.city,
          state: req.body.state,
          zipCode: req.body.zipCode,
          country: req.body.country,
          phone: req.body.phone,
      };

      // Find the address by ID and update it
      const result = await Address.findByIdAndUpdate(addressId, updatedAddress, { new: true });

      if (!result) {
          return res.status(404).json({ success: false, message: 'Address not found' });
      }

      res.json({ success: true, message: 'Address updated successfully', data: result });
  } catch (error) {
      console.error('Edit Address Error:', error); // More descriptive logging
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
}

const deleteaddress=async (req, res) => {
  try {
      const result = await Address.findByIdAndDelete(req.params.id);
      if (!result) {
          return res.status(404).json({ success: false, message: 'Address not found' });
      }
      res.status(200).json({ success: true });
  } catch (error) {
      console.error('Error deleting address:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}

const post_forgot_password = async (req, res) => {
  const { email } = req.body;

  try {
    const userRecord = await user.findOne({ email });
    if (!userRecord) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate OTP
    const otp = otpGenerator.generate(6, {
      digits: true,
      specialChars: false,
      upperCase: false,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
    });

    // Save OTP to database
    const otpRecord = new OTP({ email, otp });
    await otpRecord.save();

    // Send OTP email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP for password reset is: ${otp}`,
    };
    await transporter.sendMail(mailOptions);

    // Store email in session for later use
    req.session.resetEmail = email;

    res.json({ success: true });
  } catch (error) {
    console.error("Error in forgot password:", error);
    res.status(500).json({ error: "An error occurred" });
  }
};

const post_verify_reset_otp = async (req, res) => {
  const { otp } = req.body;
  const email = req.session.resetEmail;

  try {
    const otpRecord = await OTP.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // OTP is valid, allow password reset
    res.json({ success: true });
  } catch (error) {
    console.error("Error in OTP verification:", error);
    res.status(500).json({ error: "An error occurred" });
  }
};

const post_reset_password = async (req, res) => {
  const { newPassword } = req.body;
  const email = req.session.resetEmail;

  try {
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password
    await user.findOneAndUpdate({ email }, { password: hashedPassword });

    // Clear the session
    delete req.session.resetEmail;

    res.json({ success: true });
  } catch (error) {
    console.error("Error in password reset:", error);
    res.status(500).json({ error: "An error occurred" });
  }
};

  module.exports={deleteaddress,postaddressedit, postaddressadd,get_myaccount,get_home,get_wishlist,get_cart,get_about,get_contact,get_faq,get_error,post_signup,post_login,post_verify_otp,post_resend_otp,get_ProductPage,get_singleproduct,category,getlogout, post_forgot_password, post_verify_reset_otp, post_reset_password};