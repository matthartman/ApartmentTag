// The User model

var mongoose = require('mongoose')
  , Tag = require('./tag.js')
  , ObjectId = mongoose.Schema.Types.ObjectId
  , mongooseAuth = require('mongoose-auth')
  , mailgun = require('mailgun');

var userSchema = new mongoose.Schema({
    name: String
//  , email: {type: String, index: { unique: true, sparse: true }}
  , criteria: {}
  , isAdmin: Boolean
  , lastLogin: { type: Date, default: new Date() }
  , created: { type: Date, default: new Date() }
  , notifications: [{ type: ObjectId, ref: 'Notification' }]
});

// mongoose-auth plug-in for Facebook auth
userSchema.plugin(mongooseAuth, {
    // Here, we attach your User model to every module
    everymodule: {
      everyauth: {
          User: function () {
            return User;
          }
      }
    }
    
  , facebook: {
      everyauth: {
          myHostname: process.env.FACEBOOK_HOSTNAME
        , appId: process.env.FACEBOOK_APP_ID
        , appSecret: process.env.FACEBOOK_APP_SECRET
        , redirectPath: '/'
        , scope: 'email,publish_stream'
        , findOrCreateUser: function (session, accessToken, accessTokExtra, fbUserMetadata) {
            var promise = this.Promise();
            var userId;
            
            if (session.auth && session.auth.userId) {
              userId = session.auth.userId;
            } else if (session.tempUser && session.tempUser.userId) {
              userId = session.tempUser.userId;
            }
            if (userId) {
              findAndUpdate(userId, 'fb', fbUserMetadata, function(err, user) {
                if (err) {
                  promise.fulfill([err]);
                } else {
                  promise.fulfill(user);
                }
              });
            } else {
              var user = new User({'fb' : fbUserMetadata});
              user.save(function(err) {
                promise.fulfill(user);
              });
            }
            return promise;
          }
      }
    }
  /*
  This started throwing this error:
  MongoError: E11000 duplicate key error index: aptag_mongolab_medium1.users.$email_1  dup key: { : null }
    
  , password: {
        loginWith: 'email'
      , everyauth: {
            getLoginPath: '/login'
          , postLoginPath: '/login'
          , loginView: 'login.jade'
          , getRegisterPath: '/register'
          , postRegisterPath: '/register'
          , registerView: 'register.jade'
          , loginSuccessRedirect: '/'
          , registerSuccessRedirect: '/'
        }
    }
    */
});

exports.userSchema = userSchema;

module.exports = exports = User = mongoose.model('User', userSchema);


/**
 * Middleware
 */

userSchema.pre('save', function(next) {
  this.lastLogin = new Date();
  next();
});


/**
 * Static model methods
 */

// include this middleware for functions where a users actions will be recorded even if they aren't logged in, such as messages and favorites
exports.checkOrCreateUser = function(req, res, next) {
  if (!req.user) {
    console.log(req.session);
    if (req.session.auth) {
      User.findById(req.session.auth.userId, function(err, user) {
        console.log('session user found');
        req.user = user;
        next();
      });
    } else if (req.session.tempUser) {
      User.findById(req.session.tempUser.userId, function(err, user) {
        console.log('temp user session found');
        req.user = user;
        req.session.tempUser = { userId : user._id };
        next();
      });
    } else {
      console.log('new user created');
      var user = new User({created: new Date()});
      user.save(function(err) {
        console.log(err);
        console.log(user);
        req.session.tempUser = { userId : user._id };
        req.user = user;
        next();
      });
    }
  }
}

exports.mailLandlord = function(){}


/**
 * Private methods
 */

function findAndUpdate(userId, source, sourceData, onComplete) {
  findById(userId, function(err, user) {
    if (err) {
      onComplete(err);
    } else if (user) {
      User.update({ _id : user._id }, { source : sourceData }, function(err, user) {
        onComplete(err, user);
      });
    } else {
      console.log('user not found!');
      onComplete(new Error('user not found'));
    }
  });
}

function findById(userId, onComplete) {
  User.findOne({_id: userId}, onComplete);
}