const express=require('express')
const googleRouter=express.Router()
const passport=require("../config/passport")


googleRouter.get(
    "/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );
  
  // Google OAuth Callback URL
  googleRouter.get("/google/callback", passport.authenticate("google", { failureRedirect: "/", failureFlash: true }),

 // Enable flash messages on failure
    (req, res) => {
      // Successful authentication, redirect to home or dashboard
      if (req.isAuthenticated()) {
        const googleUser = req.user;
        req.session.user = googleUser.id || googleUser._id;
        res.redirect("/user/");  // Redirect to your desired page after login (e.g., home, dashboard, etc.)
      } else {
        res.redirect("/");  // If something goes wrong after authentication
      }
    }
  );

module.exports=googleRouter;