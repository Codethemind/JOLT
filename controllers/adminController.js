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



const ordermanagment=async(req,res)=>{
const order=await Order.find({}).populate('user').populate('address').populate('items.product')


  res.render('admin_ordermanagment',{order})
}


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


  module.exports={updateorderstatus,ordermanagment,admin_login_page,admin_post_login,admin_get_dashboard,admin_get_usermanagment,admin_get_productmanagment,admin_get_addproduct,
    admin_get_catagorymanagment,admin_get_brandmanagment,admin_blockuser,admin_unblockuser,admin_post_addcategory,admin_put_deletcategory,admin_put_restorecategory,admin_put_updatecategory,admin_post_addproduct,admin_get_logout,admin_put_restoreproduct,admin_put_deletproduct,admin_edit_product,admin_update_product};