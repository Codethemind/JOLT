const express=require('express')
const user =require('../models/usercollection')
const Category =require('../models/catagorycollection')
const adminRouter=express.Router()
const {admin_login_page, admin_post_login, admin_get_dashboard, admin_get_usermanagment, admin_get_productmanagment, admin_get_addproduct, admin_get_catagorymanagment, admin_get_brandmanagment}=require('../controllers/adminController')



adminRouter.get('/',admin_login_page),
adminRouter.post('/admin_login',admin_post_login),
adminRouter.get('/admin_dashbord',admin_get_dashboard),
adminRouter.get('/admin_usermanagment',admin_get_usermanagment),
adminRouter.get('/admin_productmanagment',admin_get_productmanagment),
adminRouter.get('/admin_addproduct',admin_get_addproduct),
adminRouter.get('/admin_catagorymanagment',admin_get_catagorymanagment),
adminRouter.get('/admin_brandmanagment',admin_get_brandmanagment),


adminRouter.get('/admin_addproduct',(req,res)=>{
    res.render('admin_addproduct')
}),


// Assuming you have a User model with a 'blocked' field

// Block user
adminRouter.post('/block/:id', async (req, res) => {
  try {
    
    const userId = req.params.id;
    // Update the user in your database (set 'blocked' to true)
    await user.findByIdAndUpdate(userId, { isBlock: true });
    
    res.json({ success: true, message: 'User blocked successfully' });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: 'Failed to block user' });
  }
});

// Unblock user
adminRouter.post('/unblock/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    // Update the user in your database (set 'blocked' to false)
    await user.findByIdAndUpdate(userId, { isBlock: false });
    
    res.json({ success: true, message: 'User unblocked successfully' });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: 'Failed to unblock user' });
  }
});



adminRouter.post('/add-category', async (req, res) => {
    try {
        const { name } = req.body;
        const newCategory = new Category({ name });
        console.log(89)
        await newCategory.save();
        res.status(201).json({ success: true, message: 'Category added successfully' });
    } catch (error) {
        console.error('Error adding category:', error);
        res.status(500).json({ success: false, message: 'Failed to add category' });
    }
});

adminRouter.put('/delete-category/:id', async (req, res) => {
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
});

adminRouter.put('/restore-category/:id', async (req, res) => {
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
});

adminRouter.put('/update-category/:id', async (req, res) => {
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
});




module.exports=adminRouter;