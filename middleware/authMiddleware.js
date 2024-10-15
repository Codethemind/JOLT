const User = require('../models/usercollection');

const authMiddleware = async (req, res, next) => {
    res.locals.User = null;
    if (req.session && req.session.user) {
        try {
            const user = await User.findById(req.session.user);
            if (user) {
                res.locals.User = user;
            }
        } catch (error) {
            console.error('Error in auth middleware:', error);
        }
    }
    next();
};

module.exports = authMiddleware;
