module.exports=(req,res,next)=>{
    if(req.session && req.session.username){
        return next();
    }else{
        res.redirect('/')
    }
}