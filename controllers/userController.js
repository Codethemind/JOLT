const user =require('../models/usercollection')
const Address =require('../models/adresscollection')
const Order =require('../models/ordercollection')
const OTP =require('../models/otpcollection')
const Category =require('../models/catagorycollection')
const Product=require('../models/poductcollection')
const Cart=require('../models/cartCollection')
const Wallet = require('../models/walletCollection')
const Settings = require('../models/settingsCollection');
const Wishlist = require('../models/wishlistCollection'); 
const PDFDocument = require('pdfkit'); 
const fs = require('fs'); 


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

// Add this function at the top of the file
async function generateUniqueReferralCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
  } while (await user.findOne({ referralCode: code }));
  return code;
}




const get_home = async (req, res) => {
  try {
    const categoryId = req.query.category;

    let query = { isDelete: false };
    if (categoryId) {
      query.category_id = categoryId;
    }

    const [product, categories, top, User, cameraCategory] = await Promise.all([
      Product.find(query).populate('category_id').populate('brand_id').populate('variants.offer'),
      Category.find({ isDeleted: false }),
      Product.find({ 'variants.stock': { $lt: 16 }, isDelete: false }).populate('variants.offer'),
      user.findOne({ _id: req.session.user }),
      Category.findOne({ name: 'Cameras' })
    ]);

    let onsale = [];
    if (cameraCategory) {
      onsale = await Product.find({ category_id: cameraCategory._id, isDelete: false })
        .populate('category_id')
        .populate('variants.offer')
        .exec();
    }

    res.render("home", {
      categories,
      product,
      top,
      onsale,
      User,
      queryCategory: categoryId,
      cartCount: res.locals.cartCount,
      wishlistCount: res.locals.wishlistCount
    });

  } catch (error) {
    console.error('Error in get_home:', error);
    res.status(500).send('An error occurred');
  }
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
    const { name, email, password, referralCode } = req.body;

    

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

        // Store user data in the session
        req.session.pendingUser = {
            name,
            email,
            password: hashedPassword,
            referralCode
        };

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
        const pendingUserData = req.session.pendingUser;
        
        if (!pendingUserData) {
    
            return res.status(400).json({ error: "Session data missing or expired" });
        }

        const { name, email, password, referralCode } = pendingUserData;


        // Find the OTP record
        const otpcheck = await OTP.findOne({ email });

        if (!otpcheck) {
 
            return res.status(400).json({ error: "Invalid OTP" });
        }

        // Check if OTP matches and is for the correct email
        if (otpcheck.otp === otp && otpcheck.email === email) {
 
            const newUser = new user({
                name,
                email,
                password,
                referralCode: await generateUniqueReferralCode()
            });


            if (referralCode) {
                
                const referrer = await user.findOne({ referralCode });
                if (referrer) {
                  
                    newUser.referredBy = referrer._id;
                    
  
                    const referralBonus = await getReferralBonus();

                    let wallet = await Wallet.findOne({ userId: referrer._id });
                    if (!wallet) {
            
                        wallet = new Wallet({ userId: referrer._id, balance: 0 });
                    }
                    wallet.balance += referralBonus;
                    wallet.transactions.push({
                        amount: referralBonus,
                        type: 'Credit',
                        description: 'Referral Bonus',
                        date: new Date()
                    });
                    await wallet.save();
                    referrer.referralEarnings += referralBonus;
                    await referrer.save();
                } else {
                    console.log(`No referrer found for code: ${referralCode}`);
                }
            } else {
                console.log("No referral code provided");
            }

            await newUser.save();
   
            delete req.session.pendingUser;

            // Optionally, delete the OTP record
            await OTP.deleteOne({ email });

            return res.status(200).json({
                success: true,
                successRedirectUrl: "#login-form",
            });
        } else {
            console.log("OTP verification failed");
            return res.status(400).json({ error: "Invalid OTP" });
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
                sortCriteria = { sold: -1 }; 
                break;
            case 'price-low-high':
                sortCriteria = { 'variants.price': 1 }; 
                break;
            case 'price-high-low':
                sortCriteria = { 'variants.price': -1 }; 
                break;
            case 'ratings':
                sortCriteria = { averageRating: -1 }; 
                break;
            case 'featured':
                sortCriteria = { featured: -1, createdAt: -1 }; 
                break;
            case 'a-z':
                sortCriteria = { product_name: 1 };
                break;
            case 'z-a':
                sortCriteria = { product_name: -1 }; 
                break;
            default:
                sortCriteria = { createdAt: -1 };
        }

       
        const searchFilter = searchQuery
            ? { product_name: { $regex: searchQuery, $options: 'i' }, isDelete: false } 
            : { isDelete: false }; 

        
        const totalProducts = await Product.countDocuments(searchFilter).populate('variants.offer');

     
        const products = await Product.find(searchFilter).populate('variants.offer')
            .sort(sortCriteria)
            .skip(skip)
            .limit(limit)
            .exec();

     
        const categories = await Category.find();

     
        const totalPages = Math.ceil(totalProducts / limit);

  
        const noProductsFound = products.length === 0;

    
        res.render('productpage', {
            products,
            categories,
            currentPage: page,
            totalPages,
            searchQuery,
            sortOption,
            noProductsFound 
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
        const page = parseInt(req.query.page) || 1; 
        const limit = 4; 
        const skip = (page - 1) * limit; 
        
      
        const totalProducts = await Product.countDocuments({ category_id: id, isDelete: false });
        
   
        const products = await Product.find({ category_id: id, isDelete: false })
                                      .skip(skip)
                                      .limit(limit)
                                      .populate('category_id')
                                      .exec();
        
       
        const category = await Category.findById(id);
        
        if (!category) {
            return res.status(404).send('Category not found');
        }
        

        const totalPages = Math.ceil(totalProducts / limit);
        
        res.render('category', {
            products,  
            category, 
            currentPage: page,  
            totalPages: totalPages  
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
  .sort({ createdAt: -1 }) 
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
  const userId = req.session.user; 

  const newAddress = new Address({
      userId, 
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

    
      const result = await Address.findByIdAndUpdate(addressId, updatedAddress, { new: true });

      if (!result) {
          return res.status(404).json({ success: false, message: 'Address not found' });
      }

      res.json({ success: true, message: 'Address updated successfully', data: result });
  } catch (error) {
      console.error('Edit Address Error:', error); 
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

   
    const otp = otpGenerator.generate(6, {
      digits: true,
      specialChars: false,
      upperCase: false,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
    });

    const otpRecord = new OTP({ email, otp });
    await otpRecord.save();


    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP for password reset is: ${otp}`,
    };
    await transporter.sendMail(mailOptions);


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
 
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await user.findOneAndUpdate({ email }, { password: hashedPassword });

    delete req.session.resetEmail;

    res.json({ success: true });
  } catch (error) {
    console.error("Error in password reset:", error);
    res.status(500).json({ error: "An error occurred" });
  }
};

async function getReferralBonus() {
    const settings = await Settings.findOne();
    const bonus = settings ? settings.referralBonus : 100; // Default to 100 if not set
    return bonus;
}

const getOrderDetails = async (orderId) => {
  try {
      const order = await Order.findById(orderId)
          .populate('user') 
          .populate('address') 
          .populate('items.product'); 

      if (!order) {
          throw new Error('Order not found');
      }

      return order;
  } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
  }
};


const downloadInvoice = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await getOrderDetails(orderId);

        if (!order || order.orderStatus !== 'Delivered') {
            return res.status(404).send('Invoice not available for this order');
        }

        const invoiceNumber = generateInvoiceNumber(order);
        const invoiceDir = path.resolve(__dirname, '../invoices');
        const invoicePath = path.join(invoiceDir, `invoice-${orderId}.pdf`);

        if (!fs.existsSync(invoiceDir)) {
            fs.mkdirSync(invoiceDir, { recursive: true });
        }

        const pdfDoc = new PDFDocument({ margin: 50 });
        const writeStream = fs.createWriteStream(invoicePath);
        pdfDoc.pipe(writeStream);

        // Add logo (if exists)
        const logoPath = path.join(__dirname, '../public/images/demos/demo-4/logo.png'); // Adjust this path to where your logo is actually located
        if (fs.existsSync(logoPath)) {
            pdfDoc.image(logoPath, 50, 45, { width: 50 });
        }

        pdfDoc.fontSize(20)
            .text('JOLT', 110, 57)
            .fontSize(10)
            .text('123 Main Street, City, Country', 200, 65, { align: 'right' })
            .text('Phone: (123) 456-7890', 200, 80, { align: 'right' })
            .moveDown();

        generateHr(pdfDoc, 185);

        // Add invoice details
        const customerInformationTop = 200;
        pdfDoc.fontSize(10)
            .text(`Invoice Number: ${invoiceNumber}`, 50, customerInformationTop)
            .text(`Invoice Date: ${new Date().toLocaleDateString()}`, 50, customerInformationTop + 15)
            .text(`Order ID: ${order._id}`, 50, customerInformationTop + 30)
            .text(`Order Date: ${new Date(order.placedAt).toLocaleDateString()}`, 50, customerInformationTop + 45)
            .text(`Order Status: ${order.orderStatus}`, 50, customerInformationTop + 60)
            .text(order.user.name, 300, customerInformationTop)
            .text(order.address.streetAddress, 300, customerInformationTop + 15)
            .text(`${order.address.city}, ${order.address.state} ${order.address.zipCode}`, 300, customerInformationTop + 30)
            .text(order.address.country, 300, customerInformationTop + 45)
            .moveDown();

        generateHr(pdfDoc, 252);

        // Add table header
        let i;
        const invoiceTableTop = 330;
        pdfDoc.fontSize(10)
            .text('Item', 50, invoiceTableTop)
            .text('Description', 150, invoiceTableTop)
            .text('Quantity', 280, invoiceTableTop, { width: 90, align: 'right' })
            .text('Unit Price', 370, invoiceTableTop, { width: 90, align: 'right' })
            .text('Line Total', 0, invoiceTableTop, { align: 'right' });

        generateHr(pdfDoc, invoiceTableTop + 20);

        // Add table rows
        let position = invoiceTableTop + 30;
        for (i = 0; i < order.items.length; i++) {
            const item = order.items[i];
            const description = item.product.description 
                ? item.product.description.substring(0, 30) + '...'
                : 'No description available';
            position = generateTableRow(
                pdfDoc,
                position,
                item.product.product_name,
                description,
                item.quantity,
                item.price / item.quantity,
                item.price
            );
        }

        generateHr(pdfDoc, position + 20);

        // Add total
        const subtotalPosition = position + 30;
        pdfDoc.fontSize(10)
            .text('Subtotal', 400, subtotalPosition, { width: 100, align: 'right' })
            .text(`Rs. ${order.totalAmount}`, 0, subtotalPosition, { align: 'right' });

        pdfDoc.fontSize(10)
            .text('Total', 400, subtotalPosition + 25, { width: 100, align: 'right' })
            .text(`Rs. ${order.totalAmount}`, 0, subtotalPosition + 25, { align: 'right' });

        // Add footer
        pdfDoc.fontSize(10)
            .text('Thank you for your business!', 50, 700, { align: 'center', width: 500 });

        pdfDoc.end();

        writeStream.on('finish', () => {
            console.log(`Invoice generated: ${invoicePath}`);
            res.download(invoicePath);
        });

        writeStream.on('error', (err) => {
            console.error('Error writing PDF:', err);
            res.status(500).send('Error generating invoice');
        });

    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).send('Error generating invoice');
    }
};

function generateHr(doc, y) {
    doc.strokeColor("#aaaaaa")
        .lineWidth(1)
        .moveTo(50, y)
        .lineTo(550, y)
        .stroke();
}

function generateTableRow(doc, y, item, description, quantity, unitCost, lineTotal) {
    const itemName = item.length > 25 ? item.substring(0, 22) + '...' : item;
    doc.fontSize(10)
        .text(itemName, 50, y)
        .text(description, 150, y)
        .text(quantity.toString(), 280, y, { width: 90, align: 'right' })
        .text(`Rs. ${unitCost.toFixed(2)}`, 370, y, { width: 90, align: 'right' })
        .text(`Rs. ${lineTotal.toFixed(2)}`, 0, y, { align: 'right' });
    return y + 30;
}

function generateInvoiceNumber(order) {
  // Convert order._id to a string and slice the first 6 characters
  const orderIdString = order._id.toString(); // Convert ObjectId to string
  const shortId = orderIdString.slice(0, 6); // Use slice on the string
  const invoiceNumber = `INV-${shortId}-${Date.now()}`; // Create invoice number with timestamp
  return invoiceNumber;
}



  module.exports={downloadInvoice,deleteaddress,postaddressedit, postaddressadd,get_myaccount,get_home,get_wishlist,get_cart,get_about,get_contact,get_faq,get_error,post_signup,post_login,post_verify_otp,post_resend_otp,get_ProductPage,get_singleproduct,category,getlogout, post_forgot_password, post_verify_reset_otp, post_reset_password, generateUniqueReferralCode, generateHr, generateTableRow};
