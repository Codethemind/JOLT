const user =require('../models/usercollection')
const OTP =require('../models/otpcollection')
const Category =require('../models/catagorycollection')
const Brand =require('../models/brandcollection')
const Product =require('../models/poductcollection')
const Order =require('../models/ordercollection')
const Address=require('../models/adresscollection')
const bcrypt=require('bcrypt')
const upload = require('../config/multer')
const Wallet = require('../models/walletCollection');
const Settings = require('../models/settingsCollection');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const pdf = require('html-pdf-node');

const admin_login_page=(req,res)=>{
    res.render('admin_login_page')
}
const admin_post_login = async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  try {
    const adminExist = await user.findOne({ email: email });
    if (adminExist) {
      if (adminExist.isAdmin) {
        const passwordMatch = await bcrypt.compare(password, adminExist.password);
        if (passwordMatch) {
          req.session.isAdmin = true;
          return res.json({ success: true }); // Send a success response
        } else {
          return res.json({ success: false, error: "Incorrect password" }); // Send JSON error response
        }
      } else {
        return res.json({ success: false, error: "You are not admin" }); // Send JSON error response
      }
    } else {
      return res.json({ success: false, error: "Email not found" }); // Send JSON error response
    }
  } catch (err) {
    console.log("Error in login", err);
    return res.status(500).json({ success: false, error: "Internal server error" }); // Handle server error
  }
};


const admin_get_dashboard=(req,res)=>{
        res.render('admin_dashboard')
    }
const admin_get_usermanagment = async (req, res) => {
      try {
          const page = parseInt(req.query.page) || 1; // Get current page from query, default is 1
          const limit = 5; // Number of users per page
          const skip = (page - 1) * limit; // Calculate how many users to skip
  
          // Fetch total number of users (non-admin users)
          const totalUsers = await user.countDocuments({ isAdmin: false });
  
          // Fetch users for the current page
          const users = await user.find({ isAdmin: false }).skip(skip).limit(limit);
  
          // Calculate total number of pages
          const totalPages = Math.ceil(totalUsers / limit);
  
          // Render the user management view with paginated users and pagination data
          res.render('admin_usermanagment', {
              users,
              currentPage: page,
              totalPages: totalPages,
          });
      } catch (error) {
          console.error('Error fetching users:', error);
          res.status(500).send('Server Error');
      }
  };
  

    
    const admin_get_productmanagment = async (req, res) => {
      try {
          const page = parseInt(req.query.page) || 1; // Current page number
          const limit = 5; // Number of products per page
          const skip = (page - 1) * limit; // Calculate how many products to skip
  
          // Fetch the total count of products (for pagination)
          const totalProducts = await Product.countDocuments();
  
          // Fetch products with pagination
          const products = await Product.find()
              .populate('category_id')
              .populate('brand_id')
              .skip(skip)
              .limit(limit);
  
          // Calculate total pages
          const totalPages = Math.ceil(totalProducts / limit);
  
          res.render('admin_productmanagment', {
              products,
              currentPage: page,
              totalPages: totalPages,
          });
      } catch (error) {
          console.error('Error fetching products:', error);
          res.status(500).send('Server Error');
      }
  };
  
  const admin_get_catagorymanagment = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Current page
        const limit = 5; // Number of categories per page
        const skip = (page - 1) * limit; // Calculate how many categories to skip

        // Fetch total number of categories for pagination
        const totalCategories = await Category.countDocuments();

        // Fetch paginated categories
        const categories = await Category.find().skip(skip).limit(limit);

        // Calculate total number of pages
        const totalPages = Math.ceil(totalCategories / limit);

        // Render the category management view with pagination data
        res.render('admin_catagorymanagment', {
            categories,
            currentPage: page,
            totalPages: totalPages,
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).send('Server Error');
    }
};

const admin_get_brandmanagment = async (req, res) => {
  try {
      const page = parseInt(req.query.page) || 1; // Current page, default is 1
      const limit = 5; // Number of brands per page
      const skip = (page - 1) * limit; // Calculate how many brands to skip

      // Fetch total number of brands for pagination
      const totalBrands = await Brand.countDocuments();

      // Fetch paginated brands
      const brands = await Brand.find().skip(skip).limit(limit);

      // Calculate total number of pages
      const totalPages = Math.ceil(totalBrands / limit);

      // Render the brand management view with pagination data
      res.render('admin_brandmanagment', {
          brands,
          currentPage: page,
          totalPages: totalPages,
      });
  } catch (error) {
      console.error('Error fetching brands:', error);
      res.status(500).send('Server Error');
  }
};

const admin_get_addproduct=async (req, res) => {
  try {
      const category = await Category.find(); // Fetch categories from the DB
      const brand = await Brand.find(); // Fetch brands from the DB
      res.render('admin_addproduct', { category, brand });
  } catch (err) {
      console.error('Error fetching categories and brands:', err);
      res.status(500).send('Error fetching categories and brands');
  }
}
const admin_blockuser=async (req, res) => {
  try {
    
    const userId = req.params.id;
    // Update the user in your database (set 'blocked' to true)
    await user.findByIdAndUpdate(userId, { isBlock: true });
    
    res.json({ success: true, message: 'User blocked successfully' });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: 'Failed to block user' });
  }
}
const admin_unblockuser=async (req, res) => {
  try {
    const userId = req.params.id;
    // Update the user in your database (set 'blocked' to false)
    await user.findByIdAndUpdate(userId, { isBlock: false });
    
    res.json({ success: true, message: 'User unblocked successfully' });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: 'Failed to unblock user' });
  }
}
const admin_post_addcategory = async (req, res) => {
  try {
    const { name } = req.body;

    // Check if the category already exists
    const existingCategory = await Category.findOne({ name: name });

    if (existingCategory) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }

    // Create a new category
    const newCategory = new Category({ name: name });
    await newCategory.save();

    res.status(201).json({ success: true, message: 'Category added successfully' });

  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ success: false, message: 'Failed to add category' });
  }
}

const admin_put_deletcategory= async (req, res) => {
  try {
      const { id } = req.params;
      const category = await Category.findById(id);
      if (!category) {
          return res.status(404).json({ success: false, message: 'Category not found' });
      }
      category.isDeleted = true;
      await category.save();
      res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({ success: false, message: 'Failed to delete category' });
  }
}
const admin_put_restorecategory=async (req, res) => {
  try {
      const { id } = req.params;
      const category = await Category.findById(id);
      if (!category) {
          return res.status(404).json({ success: false, message: 'Category not found' });
      }
      if (!category.isDeleted) {
          return res.status(400).json({ success: false, message: 'Category is not deleted' });
      }
      category.isDeleted = false;
      await category.save();
      res.status(200).json({ success: true, message: 'Category restored successfully' });
  } catch (error) {
      console.error('Error restoring category:', error);
      res.status(500).json({ success: false, message: 'Failed to restore category' });
  }
}
const admin_put_updatecategory= async (req, res) => {
  try {
      const { id } = req.params;
      const { name } = req.body;
      const category = await Category.findById(id);
      if (!category) {
          return res.status(404).json({ success: false, message: 'Category not found' });
      }
      category.name = name;
      await category.save();
      res.status(200).json({ success: true, message: 'Category updated successfully' });
  } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({ success: false, message: 'Failed to update category' });
  }
};
const admin_post_addproduct = async (req, res) => {
  try {
   

    if (req.session.isAdmin) {
      const {
        productName,
        productHighlights,
        productCategory,
        productBrand,
        productDescription,
        variant_count,
      } = req.body;

      if (!productName || !productHighlights || !productCategory || !productBrand || !productDescription) {
        return res.status(400).json({ error: 'All fields are required.' });
      }

      const existProduct = await Product.findOne({ product_name: productName });

      if (existProduct) {
        return res.status(400).json({ error: 'Product already exists.' });
      }

      const variantDetails = [];
      for (let i = 1; i <= variant_count; i++) {
        const price = req.body.productPrice[i];
        const color = req.body.productColor[i];
        const size = req.body.productSize[i];
        const stock = req.body.productStock[i];

        if (!price || !color || !size || !stock) {
          continue;
        }

        const numericPrice = Number(price.replace(/,/g, ''));

        const variantImages = [];
        if (req.files) {
          req.files.forEach(image => {
            if (image.fieldname.startsWith(`productImage[${i}]`)) {
              variantImages.push(image.path);
            }
          });
        }

        variantDetails.push({
          price: numericPrice,
          size: size,
          stock: stock,
          color: color,
          images: variantImages,
        });
      }

      const product = new Product({
        product_name: productName,
        product_highlights: productHighlights,
        category_id: productCategory,
        brand_id: productBrand,
        product_description: productDescription,
        variants: variantDetails,
      });

      await product.save();
 
      res.status(201).json({ message: 'Product added successfully!' });
    } else {
      res.status(403).json({ error: 'Unauthorized access.' });
    }
  } catch (error) {
    console.error("Error while adding the product:", error);
    res.status(500).json({ error: "Something went wrong while adding the product" });
  }
};

const admin_put_deletproduct= async (req, res) => {
  try {
      const { id } = req.params;
      const product = await Product.findById(id);
      if (!product) {
          return res.status(404).json({ success: false, message: 'Category not found' });
      }
      product.isDelete = true;
      await product.save();
      res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({ success: false, message: 'Failed to delete category' });
  }
}
const admin_put_restoreproduct=async (req, res) => {
  try {
      const { id } = req.params;
      const product = await Product.findById(id);
      if (!product) {
          return res.status(404).json({ success: false, message: 'Category not found' });
      }
      if (!product.isDelete) {
          return res.status(400).json({ success: false, message: 'Category is not deleted' });
      }
      product.isDelete = false;
      await product.save();
      res.status(200).json({ success: true, message: 'Category restored successfully' });
  } catch (error) {
      console.error('Error restoring category:', error);
      res.status(500).json({ success: false, message: 'Failed to restore category' });
  }
}

const admin_get_logout=(req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/admin");
    }
  });
}

const admin_edit_product=async (req,res)=>{
  const {id} = req.params;
  const product=await Product.findById(id).populate('category_id').populate('brand_id')
  const categories = await Category.find();
  const brands = await Brand.find();
  res.render('admin_editproduct',{product,categories,brands})
}



const admin_update_product = async (req, res) => {
  try {
      const productId = req.params.id;
      const productData = req.body;
      const variants = productData.variants || [];

      // Check if the product exists
      const product = await Product.findById(productId);
      if (!product) {
          return res.status(404).json({ message: 'Product not found.' });
      }

      // Process uploaded images for each variant
      const productImagePaths = req.files['variant_images_1[]'] ? req.files['variant_images_1[]'].map(file => file.path) : [];
      // Add more image processing as necessary

      // Update product data
      const updatedVariants = [];
      for (let i = 0; i < Math.max(product.variants.length, variants.length); i++) {
          updatedVariants[i] = {
              ...product.variants[i], // Keep existing data
              price: variants[i]?.price || product.variants[i].price,
              stock: variants[i]?.stock || product.variants[i].stock,
              size: variants[i]?.size || product.variants[i].size,
              color: variants[i]?.color || product.variants[i].color,
              images: productImagePaths.length > 0 ? productImagePaths : (product.variants[i]?.images || [])
          };
      }

      // Save updated product details
      product.product_name = productData.product_name;
      product.product_highlights = productData.product_highlights;
      product.product_description = productData.product_description;
      product.variants = updatedVariants;

      await product.save();
      res.status(200).json({ message: 'Product updated successfully!', product });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error', error: error.message });
  }
};



const ordermanagment = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;
    const searchQuery = req.query.search;

    let query = {};

    if (searchQuery) {
      query = {
        $or: [
          { orderId: { $regex: searchQuery, $options: 'i' } },
          { 'user.name': { $regex: searchQuery, $options: 'i' } }
        ]
      };
    }
    const totalOrders = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('user', 'name email')
      .populate('address')
      .populate('items.product')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.render('admin_ordermanagment', {
      order: orders,
      currentPage: page,
      totalPages: Math.ceil(totalOrders / limit),
      searchQuery
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send("An error occurred while fetching orders.");
  }
};


const updateorderstatus = async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  try {
    // Find the order by ID
    const order = await Order.findById(orderId).populate('items.product').populate('user');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // If the new status is 'Cancelled'
    if (status === 'Cancelled') {
      // Loop through the items in the order and update the stock for each product variant
      for (const item of order.items) {
        const product = item.product;
        const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());

        if (variant) {
          // Increment the stock for the variant
          variant.stock += item.quantity;

          // Save the updated product to reflect the stock increment
          await product.save();
        }
      }

      // If the payment method was Bank Transfer, process refund to wallet
      if (order.paymentMethod === 'Bank Transfer') {
        let wallet = await Wallet.findOne({ userId: order.user._id });
        if (!wallet) {
          wallet = new Wallet({ userId: order.user._id, balance: 0 });
        }
        wallet.balance += order.totalAmount;
        wallet.transactions.push({
          amount: order.totalAmount,
          type: 'Credit',
          description: `Refund for cancelled order ${order.orderId}`,
          date: new Date()
        });
        await wallet.save();
      }
    }

    // Update the order status
    order.orderStatus = status;
    order.orderStatusTimestamps[status.toLowerCase()] = new Date();
    await order.save(); // Save the updated order

    return res.json({ 
      success: true, 
      message: 'Order status updated successfully',
      refundProcessed: status === 'Cancelled' && order.paymentMethod === 'Bank Transfer'
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
};

const updateReferralBonus = async (req, res) => {
    try {
        const { referralBonus } = req.body;
        await Settings.findOneAndUpdate({}, { referralBonus: referralBonus }, { upsert: true });
        res.json({ success: true, message: 'Referral bonus updated successfully' });
    } catch (error) {
        console.error('Error updating referral bonus:', error);
        res.status(500).json({ success: false, message: 'Failed to update referral bonus' });
    }
};



const generateSalesReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.body;
        const orders = await Order.find({
            createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
        })
        .populate('user', 'name email')
        .populate({
            path: 'items.product',
            populate: {
                path: 'variants.offer'
            }
        })
        .populate('address')
        .sort({ createdAt: -1 });

        const doc = new PDFDocument();
        const filename = `sales_report_${startDate}_to_${endDate}.pdf`;
        const stream = fs.createWriteStream(path.join(__dirname, '..', 'public', 'reports', filename));

        doc.pipe(stream);

        // Add title and date range
        doc.fontSize(20).text('Detailed Sales Report', { align: 'center' });
        doc.fontSize(12).text(`From ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`, { align: 'center' });
        doc.moveDown();

        // Add summary
        let totalSales = 0;
        let totalOfferDiscount = 0;
        let totalCouponDiscount = 0;

        orders.forEach((order) => {
            totalSales += order.totalAmount;
            totalCouponDiscount += order.discountAmount || 0;
            order.items.forEach((item) => {
                const variant = item.product.variants.find(v => v._id.toString() === item.variantId.toString());
                if (variant && variant.offer) {
                    const originalPrice = variant.price;
                    const discountedPrice = variant.discount_price || originalPrice;
                    totalOfferDiscount += (originalPrice - discountedPrice) * item.quantity;
                }
            });
        });

        doc.fontSize(14).text(`Total Orders: ${orders.length}`);
        doc.text(`Original Total: $${totalSales.toFixed(2)}`);
        doc.text(`Offer Discount: $${totalOfferDiscount.toFixed(2)}`);
        doc.text(`Total After Offers: $${(totalSales - totalOfferDiscount).toFixed(2)}`);
        doc.text(`Coupon Discount: $${totalCouponDiscount.toFixed(2)}`);
        doc.text(`Final Total: $${(totalSales - totalOfferDiscount - totalCouponDiscount).toFixed(2)}`);
        doc.moveDown();

        // Add detailed order information
        orders.forEach((order, index) => {
            doc.fontSize(12).text(`Order ${index + 1}: ${order.orderId}`);
            doc.fontSize(10).text(`Customer: ${order.user.name} (${order.user.email})`);
            doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`);
            doc.text(`Status: ${order.orderStatus}`);
            doc.text(`Payment Method: ${order.paymentMethod}`);
            doc.moveDown(0.5);

            // Add item details
            order.items.forEach(item => {
                const variant = item.product.variants.find(v => v._id.toString() === item.variantId.toString());
                doc.text(`Product: ${item.product.product_name}`);
                doc.text(`  Color: ${variant.color}, Size: ${variant.size}`);
                doc.text(`  Quantity: ${item.quantity}`);
                doc.text(`  Original Price: $${variant.price.toFixed(2)}`);
                if (variant.offer) {
                    doc.text(`  Offer: ${variant.offer.offerName} (${variant.offer.offerPercentage}% off)`);
                    doc.text(`  Discounted Price: $${(variant.discount_price || variant.price).toFixed(2)}`);
                }
                doc.text(`  Subtotal: $${(item.price * item.quantity).toFixed(2)}`);
                doc.moveDown(0.5);
            });

            doc.text(`Subtotal: $${order.totalAmount.toFixed(2)}`);
            if (order.discountAmount) {
                doc.text(`Coupon Discount: $${order.discountAmount.toFixed(2)}`);
            }
            doc.text(`Total: $${(order.totalAmount - (order.discountAmount || 0)).toFixed(2)}`);
            doc.moveDown();
            doc.text('---------------------------------------------------');
            doc.moveDown();
        });

        doc.end();

        stream.on('finish', () => {
            res.download(path.join(__dirname, '..', 'public', 'reports', filename));
        });

    } catch (error) {
        console.error('Error generating sales report:', error);
        res.status(500).json({ error: 'Error generating sales report' });
    }
};

const downloadReport = async (req, res) => {
  console.log('Generating sales report...');
  try {
    const { startDate, endDate } = req.body;
    
    const query = {
      createdAt: {
        $gte: moment(startDate).startOf("day").toDate(),
        $lte: moment(endDate).endOf("day").toDate()
      }
    };

    const orders = await Order.find(query)
      .populate("user", "name email")
      .populate({
          path: "items.product",
          select: "product_name variants",
        populate: {
          path: "variants.offer",
          select: "offerName offerPercentage"
        }
      })
      .populate("address")
      .exec();

    if (!orders || orders.length === 0) {
      return res.status(404).json({ success: false, error: "No orders found for the selected date range." });
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const filename = `salesReport_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
    const pdfPath = path.join(__dirname, '..', 'public', 'reports', filename);
    const writeStream = fs.createWriteStream(pdfPath);

    doc.pipe(writeStream);

    // Add title and date range
    doc.fontSize(20).text('Sales Report', { align: 'center' });
    doc.fontSize(12).text(`Report Period: ${moment(startDate).format('MMMM Do YYYY')} to ${moment(endDate).format('MMMM Do YYYY')}`, { align: 'center' });
    doc.moveDown();

    // Add summary
    let totalOrders = orders.length;
    let totalSales = 0;
    let totalOfferDiscount = 0;
    let totalCouponDiscount = 0;

    orders.forEach(order => {
      totalSales += order.totalAmount;
      totalCouponDiscount += order.discountAmount || 0;
      order.items.forEach(item => {
        const variant = item.product.variants.find(v => v._id.toString() === item.variantId.toString());
        if (variant && variant.offer) {
          const originalPrice = variant.price;
          const discountedPrice = variant.discount_price || originalPrice;
          totalOfferDiscount += (originalPrice - discountedPrice) * item.quantity;
        }
      });
    });

    doc.fontSize(14).text('Summary', { underline: true });
    doc.fontSize(12).text(`Total Orders: ${totalOrders}`);
    doc.text(`Original Total: ₹${totalSales.toFixed(2)}`);
    doc.text(`Offer Discount: ₹${totalOfferDiscount.toFixed(2)}`);
    doc.text(`Total After Offers: ₹${(totalSales - totalOfferDiscount).toFixed(2)}`);
    doc.text(`Coupon Discount: ₹${totalCouponDiscount.toFixed(2)}`);
    doc.text(`Final Total: ₹${(totalSales - totalOfferDiscount - totalCouponDiscount).toFixed(2)}`);
    doc.moveDown();

    // Add order details
    doc.fontSize(14).text('Order Details', { underline: true });
    orders.forEach((order, index) => {
      doc.fontSize(12).text(`Order ${index + 1}: ${order.orderId}`, { bold: true });
      doc.fontSize(10).text(`Customer: ${order.user.name} (${order.user.email})`);
      doc.text(`Date: ${moment(order.createdAt).format('MMMM Do YYYY, h:mm:ss a')}`);
      doc.text(`Status: ${order.orderStatus}`);
      doc.text(`Payment Method: ${order.paymentMethod}`);

      doc.text('Delivery Address:');
      doc.text(`${order.address.fullName}, ${order.address.streetAddress}`);
      doc.text(`${order.address.city}, ${order.address.state}, ${order.address.zipCode}`);
      doc.text(`${order.address.country}, Phone: ${order.address.phone}`);

      doc.moveDown(0.5);
      doc.text('Order Items:', { underline: true });
      order.items.forEach(item => {
        const variant = item.product.variants.find(v => v._id.toString() === item.variantId.toString());
        doc.text(`- ${item.product.product_name}`);
        doc.text(`  Color: ${variant.color}, Size: ${variant.size}`);
        doc.text(`  Quantity: ${item.quantity}`);
        doc.text(`  Original Price: ₹${variant.price.toFixed(2)}`);
        if (variant.offer) {
          doc.text(`  Offer: ${variant.offer.offerName} (${variant.offer.offerPercentage}% off)`);
          doc.text(`  Discounted Price: ₹${(variant.discount_price || variant.price).toFixed(2)}`);
        }
        doc.text(`  Subtotal: ₹${(item.price * item.quantity).toFixed(2)}`);
      });

      doc.moveDown(0.5);
      doc.text(`Subtotal: ₹${order.totalAmount.toFixed(2)}`);
      if (order.discountAmount) {
        doc.text(`Coupon Discount: ₹${order.discountAmount.toFixed(2)}`);
      }
      doc.text(`Total: ₹${(order.totalAmount - (order.discountAmount || 0)).toFixed(2)}`);
      doc.moveDown();
      doc.text('---------------------------------------------------');
      doc.moveDown();
    });

    // Add page numbers
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.text(`Page ${i + 1} of ${pageCount}`, 
        50, 
        doc.page.height - 50, 
        { align: 'center' }
      );
    }

    doc.end();

    writeStream.on('finish', () => {
      res.download(pdfPath, filename, (err) => {
        if (err) {
          console.error("Error sending file:", err);
          res.status(500).json({ success: false, error: "Error sending file" });
        }
        // Delete the file after sending
        fs.unlinkSync(pdfPath);
      });
    });

  } catch (error) {
    console.error("Error generating sales report:", error);
    res.status(500).json({ success: false, error: "An error occurred while generating the sales report" });
  }
};

  module.exports={updateReferralBonus,updateorderstatus,ordermanagment,admin_login_page,admin_post_login,admin_get_dashboard,admin_get_usermanagment,admin_get_productmanagment,admin_get_addproduct,
    admin_get_catagorymanagment,admin_get_brandmanagment,admin_blockuser,admin_unblockuser,admin_post_addcategory,admin_put_deletcategory,admin_put_restorecategory,admin_put_updatecategory,admin_post_addproduct,admin_get_logout,admin_put_restoreproduct,admin_put_deletproduct,admin_edit_product,admin_update_product,generateSalesReport,downloadReport};