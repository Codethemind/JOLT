const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const user = require("../models/usercollection");
require("dotenv").config();

// Configure Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3001/auth/google/callback"  // This should match exactly in Google Console
},
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Find if the user already exists in the database
        let foundUser = await user.findOne({ email: profile.emails[0].value });

        if (foundUser) {
          // If user exists, pass it to done() for serialization
          return done(null, foundUser);
        } else {
          // If the user doesn't exist, create a new user
          const newUser = new user({
            username: profile.displayName,
            email: profile.emails[0].value,
            googleId: profile.id
          });
          
          // Save the new user to the database
          const savedUser = await newUser.save();
          
          // Pass the saved user to done() for serialization
          return done(null, savedUser);
        }
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// Serialize the user to the session (store user ID in the session)
passport.serializeUser((user, done) => {
 
  done(null, user._id); // Serialize only the user's ID
});

// Deserialize the user from the session (fetch user from DB using ID stored in session)
passport.deserializeUser(async (id, done) => {
  try {
    const foundUser = await user.findById(id);
   

    if (foundUser) {
      done(null, foundUser); // Successfully deserialized the user
    } else {
      done(null, false); // If no user found, return false
    }
  } catch (err) {
    done(err, null); // Handle any errors during deserialization
  }
});

module.exports = passport;


