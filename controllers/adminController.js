const user =require('../models/usercollection')
const OTP =require('../models/otpcollection')
const Category =require('../models/catagorycollection')
const Brand =require('../models/brandcollection')
const Product =require('../models/poductcollection')
const bcrypt=require('bcrypt')
const upload = require('../config/multer')


const admin_login_page=(req,res)=>{
    res.render('admin_login_page')
}
const admin_post_login=async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  try {
    const adminexist = await user.findOne({ email: email });

    if (adminexist) {
      if (adminexist.isAdmin) {
        const passwordmatch = await bcrypt.compare(
          password,
          adminexist.password
        );
        if (passwordmatch) {
          req.session.isAdmin = true;
          res.redirect("/admin/admin_dashbord");
        } else {
          res.render("admin_login_page", { passNo: "incorrect password" });
        }
      } else {
        res.render("admin_login_page", { notadmin: "You are not admin" });
      }
    } else {
      res.render("admin_login_page", { notexist: "Email not found" });
    }
  } catch (err) {
    console.log("error in login ", err);
  }
};
const admin_get_dashboard=(req,res)=>{
        res.render('admin_dashboard')
    }
const admin_get_usermanagment=async (req,res)=>{
      const users = await user.find( {isAdmin: false });
        res.render('admin_usermanagment',{users})
    }
const admin_get_productmanagment=async (req,res)=>{
      const products=await Product.find().populate('category_id').populate('brand_id')
        res.render('admin_productmanagment',{products})
    }
const admin_get_catagorymanagment=async(req,res)=>{
      const categories = await Category.find();
        res.render('admin_catagorymanagment',{categories})
    }
const admin_get_brandmanagment= async(req,res)=>{
      const brands = await Brand.find();
        res.render('admin_brandmanagment',{brands})
    }
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
const admin_post_addproduct=async (req, res) => {
  try {
    console.log('Incoming request body:', req.body); // Log the entire body
    console.log('Session Admin:', req.session.isAdmin); // Log session info
    console.log('Files:', req.files); // Log file uploads

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
        return res.status(400).send('All fields are required.');
      }

      const existProduct = await Product.findOne({ product_name: productName });

      if (existProduct) {
        return res.render('admin_addproduct', { exist: 'Product already exists' });
      }

      const variantDetails = [];
      for (let i = 1; i <= variant_count; i++) {  // Start loop at index 1
          const price = req.body.productPrice[i];
          const color = req.body.productColor[i];
          const size = req.body.productSize[i];
          const stock = req.body.productStock[i];
        
          // Skip if any of the values are empty or undefined
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
      console.log('Product saved successfully');
      res.redirect("/admin/admin_productmanagment");
    } else {
      res.redirect("/admin/admin_dashbord");
    }
  } catch (error) {
    console.error("Error while adding the product:", error);
    res.status(500).json({ error: "Something went wrong while adding the product" });
  }
}
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
  const categories = await Category.find(); // Fetch categories from the DB
  const brands = await Brand.find();
  // res.json(product)
  res.render('admin_editproduct',{product,categories,brands})
}

// Controller to update product information
const admin_update_product = async (req, res) => {
  try {
      const productId = req.params.id;
      const { product_name, product_highlights, product_description } = req.body;

      // Process uploaded files using Multer
      const productImages = req.files['productImage'] || []; // Files for 'productImage' field
      const additionalImages = req.files['additionalImages'] || []; // Files for 'additionalImages' field

      // Get the current product to retain existing images if no new images are uploaded
      const product = await Product.findById(productId);

      if (!product) {
          return res.status(404).json({ message: 'Product not found' });
      }

      // Get the file paths from the uploaded files
      const productImagePaths = productImages.map(file => file.path);
      const additionalImagePaths = additionalImages.map(file => file.path);

      // Update the product details, ensuring that images are updated only if new ones are provided
      const updatedProduct = await Product.findByIdAndUpdate(
          productId,
          {
              product_name: product_name || product.product_name,
              product_highlights: product_highlights || product.product_highlights,
              product_description: product_description || product.product_description,
              variants: product.variants.map((variant, index) => ({
                  ...variant,
                  images: productImagePaths.length > 0 ? productImagePaths : variant.images // Use new images if available
              })),
              additionalImages: additionalImagePaths.length > 0 ? additionalImagePaths : product.additionalImages // Use new additional images if available
          },
          { new: true } // Return the updated product
      );

      res.status(200).json({ success: true, message: 'Product updated successfully', updatedProduct });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
  }
};

  module.exports={admin_login_page,admin_post_login,admin_get_dashboard,admin_get_usermanagment,admin_get_productmanagment,admin_get_addproduct,
    admin_get_catagorymanagment,admin_get_brandmanagment,admin_blockuser,admin_unblockuser,admin_post_addcategory,admin_put_deletcategory,admin_put_restorecategory,admin_put_updatecategory,admin_post_addproduct,admin_get_logout,admin_put_restoreproduct,admin_put_deletproduct,admin_edit_product,admin_update_product};