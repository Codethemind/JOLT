module.exports=(req,res,next)=>{
    if(req.session && req.session.isAdmin){
        return next();
    }else{
        res.redirect('/admin')
    }
}