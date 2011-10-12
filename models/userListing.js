// The userListing model;

/**
 * Module dependencies.
 */
var mongoose = require('mongoose')
  , Listing = require('./listing.js')
  , ObjectId = mongoose.Schema.Types.ObjectId
  , MessageThread = require('./messageThread.js')
  , async = require('async')
  , Notification = require('./notification.js');


/**
 * userListing schema
 */
var userListingSchema = new mongoose.Schema({
    listingId: ObjectId
  , userId: ObjectId
  , isRead: Boolean
  , isFavorite: Boolean
  , isArchived: Boolean
  , messageThreads: [{ type: ObjectId, ref: 'MessageThread' }]
  , notifications: [{ type: ObjectId, ref: 'Notification' }]
  , lastNotificationTimestamp : Date
});

exports.userListingSchema = userListingSchema;

// PUBLIC

// Constructor
module.exports = exports = UserListing = mongoose.model('UserListing', userListingSchema);


// take a set of listings and apply the properties of any user listings to it.
// this is performed after any search, before listings are sent to user, and keeps the state of the listing persistent across searches.
exports.applyToListings = function(userId, listings, onComplete) {
  var listingIds = [];
  for (var i = 0; i < listings.length; i++) {
    listingIds.push(listings[i]._id);
  }
  UserListing.find({userId: userId, listingId: {$in : listingIds} }).populate('notifications').populate('messageThreads').run(function(err, userListings) {
    for (var i = 0; i < listings.length; i++) {
      for (var j = 0; j < userListings.length; j++) {
        if (listings[i]._id.toString() == userListings[j].listingId.toString()) {
          UserListing.mergeUserListingIntoListing(userListings[j], listings[i]);
        }
        continue;
      }
    }
    onComplete(listings);
  });
}

exports.getInbox = function(userId, onComplete) {
  var crit = {
      userId : userId
    , isArchived :
      { '$ne' : true }
    , '$or' : 
      [ 
          { isFavorite : true }
        , { notifications : { '$exists' : true } }
       ]
  };
  UserListing.find(crit).sort('lastNotificationTimestamp',-1).populate('notifications').populate('messageThreads').run(function(err, userListings) {
    onComplete(err, userListings);
  });
}

exports.getOne = function(userId, listingId, onComplete) {
  UserListing.findOne({userId: userId, listingId: listingId}).populate('notifications').populate('messageThreads').sort('lastNotificationTimestamp',-1).run(function(err, userListing) {
    onComplete(err, userListing);
  });
}

exports.applyToListing = function(userId, listing, options, onComplete) {
  var assign = function(err, userListing) {
    if (userListing)
      onComplete(err, UserListing.mergeUserListingIntoListing(userListing, listing));
    else 
      onComplete(err, listing);
  }

  if (typeof options == 'function') {
    onComplete = options;
    options = {};
  }
  
  if (options.markRead) {
    var err, userListing;
    async.parallel([
          function(done) {
            // mark notifications as read
            Notification.update({ userId : userId, listingId : listing._id },{ isUnread : false }, { multi : true }, function(thisErr, notifications) {
              err = thisErr || err;
              console.log(thisErr?thisErr:(notifications + " notifications marked as read"));
              done();
            });
          }
        , function(done) {
            // mark userlisting as read
            UserListing.update({ userId : userId, listingId : listing._id }, { isRead : true }, { upsert: true }, function (thisErr) {
              err = err || thisErr;
              if (!err) {
                UserListing.getOne(userId, listing._id, function(thisErr, thisUserListing) {
                  err = err || thisErr;
                  userListing = thisUserListing;
                  done();
                });
              } else {
                done();
              }
            });
          }
      ]
      , function(){
          assign(err, userListing);
        }
    );
  } else {
    UserListing.getOne(userId, listing._id, assign);
  }
}

exports.mergeUserListingIntoListing = function (userListing, listing) {
  if (!listing.userListingData)
    listing.userListingData = {};
  if (userListing.isRead)
    listing.userListingData.isRead = userListing.isRead;
  if (userListing.isFavorite)
    listing.userListingData.isFavorite = userListing.isFavorite;
  if (userListing.isArchived)
    listing.userListingData.isArchived = userListing.isArchived;
  if (userListing.messageThreads && userListing.messageThreads.length > 0)
    listing.messageThreads.concat(userListing.messageThreads);
  if (userListing.notifications && userListing.notifications.length > 0)
    listing.userListingData.notifications = userListing.notifications;
  if (userListing.lastNotificationTimestamp)
    listing.userListingData.lastNotificationTimestamp = userListing.lastNotificationTimestamp;
  return listing;
}

exports.updateNotificationsFromMessageThread = function(messageThread, onComplete) {
  function getUsersAndNotify() {
    // assign to userListings for relevant users
    UserListing.getUserListingsFollowingListing(messageThread.listingId, function(err, theseUserListings) {
      console.log('user listings to apply notifications to:');
      console.log(theseUserListings);
      sendNotificationsToUsersWithUserListings(messageThread, theseUserListings, onComplete);
    });
  }

  var message = messageThread.messages[messageThread.messages.length - 1];

  if (messageThread.users && messageThread.users.length > 0) { // thread is private
    var users = messageThread.users;
    sendNotificationsToUsers(messageThread, messageThread.users, onComplete);
  } else { // thread is public
    // assign to listing
    Listing.update({ _id : messageThread.listingId }, { $push: { messageThreads : messageThread } }, function(err) {
      if (err)
        onComplete(err);
      else {
        // create user listing for user asking the question, if it doesn't exist
        UserListing.findOne({ listingId : messageThread.listingId, userId : message.userId }, function(err, authorUserListing) {
          if (err)
            onComplete(err);
          else {
            if (authorUserListing) {
              console.log('userListing found');
              // generate notification ("You asked a question on listing xy")
              getUsersAndNotify();
            } else {
              console.log('userListing not found');
              console.log(message);
              new UserListing({
                  listingId : messageThread.listingId
                , userId : message.userId
                , messageThreads : [messageThread]
              }).save(function(err){
                if (err)
                  onComplete(err)
                else
                  getUsersAndNotify();
              });              
            }
          }
        });      
      }
    });
  }
}

exports.getUserListingsFollowingListing = function(listingId, onComplete) {
  // Criteria for following : isFavorite, or is not archived
  UserListing.find({
      listingId : listingId
    , isArchived :
      { '$ne' : true }
  }).populate('notifications').populate('messageThreads').run(onComplete);
}

exports.getUserListingsFromMessageThread = function(messageThread, onComplete) {
  UserListing.find({
      listingId : listingId
    , users : {
      '$in' : messageThread.users
    }
  }).populate('notifications').populate('messageThreads').run(onComplete);
}

exports.applyArgsToUserListing = function(args, onComplete) {
  var applyToListing = function() {
    UserListing.findOne({userId: args.userId, listingId: args.listingId}, function(err, userListing) {
      if (err) {
        onComplete(err)
      } else if (userListing) {
        userListing = applyArgs(userListing, args);
        userListing.save(function(err) {
          console.log(userListing);
          onComplete(err, userListing);
        });
      } else {
        args.userId = args.userId;
        userListing = new UserListing(args);
        userListing.save(function(err){
          console.log(userListing);
          onComplete(err, userListing);
        });
      }
    });  
  }
  
  if (args.isFavorite) {
    var messageText = 'You added a favorite!'
      , notificationType = 'favorite';
    Notification.create({
        message : messageText
      , userId : args.userId
      , listingId : args.listingId
      , notificationType : notificationType
    }, function(err, notification) {
      console.log(notification);
      if (notification) {
        args.notifications = new Array();
        args.notifications.push(notification._id);
        args.lastNotificationTimestamp = notification.date;
      }
      applyToListing();
    });
  } else {
    applyToListing();
  }
}

function sendNotificationsToUsersWithUserListings(messageThread, userListings, onComplete) {
  var message = messageThread.messages[messageThread.messages.length - 1];

  // get the user who sent the message. this might be the user whose session we are in, but to make the code more portable, we'll do the call again
  User.find({_id: message.userId}, function(err, messageUser) {
    if (err) {
      onComplete(err);
    } else {
      // cycle through user listings, create a notification and append the message thread if public and not there already
      async.forEach(userListings
        , function(userListing, done) {
          // create new notification
          //var messageText = req.user._id == messageUser._id ? 'You sent a message.' : ((messageUser.fb ? messageUser.fb.name.full : (messageUser.email ? messageUser.email : 'Someone')) + ' sent a new message.');
          var messageText = 'New message';
          Notification.create({
              userId: userListing.userId
            , message: messageText
            , listingId: messageThread.listingId
            , notificationType: 'message'
          }, function(err, notification) {
            if (err) {
              done(err);
            } else {
              // if not public (doesn't have users array) and thread not included already, add it in
              if (messageThread.users && messageThread.users.length > 0 && !_.include(userListing.messageThreads, messageThread._id)) {
                userListing.messageThreads.push(messageThread._id);
              }
              // either way, push the new notification
              userListing.notifications.push(notification._id);
              userListing.lastNotificationTimestamp = notification.date;
              userListing.save(function(err, userListing) {
                done(err);
              });
            }
          });
        }
        , function(err) { 
          onComplete(err, message);
        }
      );
    }
  });
}

function sendNotificationsToUsers(messageThread, users, onComplete) {
  // get the last message, which should be the newest one
  var message = messageThread.messages[messageThread.messages.length - 1];
  
  // get the user who sent the message. this might be the user whose session we are in, but to make the code more portable, we'll do the call again
  User.find({_id: message.userId}, function(err, messageUser) {
    UserListing.getUserListingsFromMessageThread(messageThread, function(err, userListings) {
      sendNotificationsToUsersWithUserListings(messageThread, userListings, function(err){
        if (err)
          onComplete(err)
        else {
          async.forEach(users, 
            function(user, done) {
              if (_.detect(userListings, function(userListing){return userListing.userId == user._id;}))
                done();
              else {
                var messageText = 'New message';
                Notification.create({
                    userId: user._id
                  , message: messageText
                  , listingId: messageThread.listingId
                  , notificationType : 'message'
                }, function(err, notification) {
                  if (err)
                    done(err);
                  else {
                    var userListing = new UserListing({
                        listingId : messageThread.listingId
                      , userId : user._id
                      , messageThreads : [messageThread]
                      , notifications : [notification]
                      , lastNotificationTimestamp : notification.date
                    }).save(function(err, savedUserListing){
                      done();
                    });
                  }
                });
              }
            }, function(err) {
              onComplete(err, message);
            }
          );
        }
      });
    });
  });
}

// PRIVATE

// there MUST be a better way to do this
function applyArgs(userListing, args) {
  if (args.isRead)
    userListing.isRead = toBoolean(args.isRead);

  if (args.isFavorite)
    userListing.isFavorite = toBoolean(args.isFavorite);

  if (args.isArchived)
    userListing.isArchived = toBoolean(args.isArchived);
    
  if (args.listingId)
    userListing.listingId = args.listingId;
    
  if (args.userId)
    userListing.userId = args.userId;
  
  if (args.notifications) {
    for (var i = 0; i < args.notifications.length; i++) {
      userListing.notifications.push(args.notifications[i]);
    }
  }
    
  if (args.lastNotificationTimestamp)
    userListing.lastNotificationTimestamp = args.lastNotificationTimestamp;

  return userListing;
}

function toBoolean(str) {
  return (str != 'false' && str != '0' && str != 0);
}
