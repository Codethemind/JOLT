const express=require('express')

const adminRouter=express.Router()
const adminController=require('../controllers/adminController')
const upload = require('../config/multer')
const adminauth=require('../middleware/adminauth')





adminRouter.get('/',adminController.admin_login_page),
adminRouter.post('/admin_login',adminController.admin_post_login),
adminRouter.get('/admin_dashbord',adminauth,adminController.admin_get_dashboard),
adminRouter.get('/admin_usermanagment',adminauth,adminController.admin_get_usermanagment),
adminRouter.get('/admin_productmanagment',adminauth,adminController.admin_get_productmanagment),
adminRouter.get('/admin_catagorymanagment',adminauth,adminController.admin_get_catagorymanagment),
adminRouter.get('/admin_brandmanagment',adminauth,adminController.admin_get_brandmanagment),
adminRouter.get('/admin_addproduct',adminauth, adminController.admin_get_addproduct);
adminRouter.post('/block/:id',adminauth,adminController.admin_blockuser );
adminRouter.post('/unblock/:id',adminauth,adminController.admin_unblockuser );
adminRouter.post('/add-category',adminauth, adminController.admin_post_addcategory);
adminRouter.put('/delete-category/:id',adminauth,adminController.admin_put_deletcategory);
adminRouter.put('/restore-category/:id',adminauth, adminController.admin_put_restorecategory);
adminRouter.put('/update-category/:id',adminauth,adminController.admin_put_updatecategory)
adminRouter.post('/add_products',adminauth,upload.any(), adminController.admin_post_addproduct);
adminRouter.put('/delete-product/:id',adminauth,adminController.admin_put_deletproduct);
adminRouter.put('/restore-product/:id',adminauth, adminController.admin_put_restoreproduct);
adminRouter.get('/editproduct/:id',adminauth,adminController.admin_edit_product);
adminRouter.get('/editproduct/:id',adminauth,adminController.admin_edit_product);
adminRouter.post('/update-product/:id',adminauth, upload.any('productImage', 4), adminController.admin_update_product);
// adminRouter.post('/update-product/:id', (req, res, next) => {
//   console.log('Update product route hit');
//   next();
// }, upload.array('productImage', 4), adminController.admin_update_product);



adminRouter.get('/logout', adminController.admin_get_logout);
  
module.exports=adminRouter;