const user =require('../models/usercollection')
const category =require('../models/catagorycollection')
const OTP =require('../models/otpcollection')
const brand =require('../models/brandcollection')
const bcrypt=require('bcrypt')

const admin_login_page=(req,res)=>{
    res.render('admin_login_page')
}

const admin_post_login=("/login", async (req, res) => {
    if(req.session.username){
      res.redirect('/user/home')
    }else{
      try {
        const check = await user.findOne({ email: req.body.email,isAdmin:true });
        if (!check) {
          return res.render("admin_login_page", {
            notexist: "User not found",
          });
        }
        const passwordMatch = await bcrypt.compare(req.body.password, check.password);
        if (passwordMatch) {
          
          req.session.username = check.username;
          req.session.email = check.email;
          if(check.isAdmin){
            req.session.username=false;
            req.session.isAdmin=true
            res.redirect('/admin/admin_dashbord')
          }else{
            res.redirect('/user')
          }
        } else {
          res.render("admin_login_page", { title: "Login Page", error: "Incorrect password" });
        }
      } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred during login.");
      }
    } });

    const admin_get_dashboard=(req,res)=>{
        res.render('admin_dashboard')
    }
    const admin_get_usermanagment=async (req,res)=>{
      const users = await user.find( {isAdmin: false });
        res.render('admin_usermanagment',{users})
    }
    const admin_get_productmanagment=(req,res)=>{
        res.render('admin_productmanagment')
    }
    const admin_get_addproduct=(req,res)=>{
        res.render('admin_addproduct')
    }
    const admin_get_catagorymanagment=async(req,res)=>{
      const categories = await category.find();
        res.render('admin_catagorymanagment',{categories})
    }
    const admin_get_brandmanagment= async(req,res)=>{
      const brands = await brand.find();
        res.render('admin_brandmanagment',{brands})
    }

  module.exports={admin_login_page,admin_post_login,admin_get_dashboard,admin_get_usermanagment,admin_get_productmanagment,admin_get_addproduct,
    admin_get_catagorymanagment,admin_get_brandmanagment};