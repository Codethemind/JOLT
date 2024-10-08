const express=require('express')
const googleRouter=express.Router()
const passport=require("../config/passport")


googleRouter.get("/google",passport.authenticate("google", { scope: ["profile", "email"] }));
googleRouter.get("/google/callback", passport.authenticate("google", { failureRedirect: "/", failureFlash: true }),
    (req, res) => {
      if (req.isAuthenticated()) {
        const googleUser = req.user;
        req.session.user = googleUser.id || googleUser._id;
        res.redirect("/user/"); 
      } else {
        res.redirect("/"); 
      }
    }
  );

module.exports=googleRouter;