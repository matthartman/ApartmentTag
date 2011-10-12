// The MessageThread model

/**
 * Module dependencies.
 */

var mongoose = require('mongoose')
  , ObjectId = mongoose.Schema.Types.ObjectId
  , Message = require('./message.js');


/**
 * MessageThread schema
 */
var messageThreadSchema = new mongoose.Schema({
    listingId: ObjectId
  , users: [ObjectId]
  , messages: [Message.messageSchema]
});
exports.messageThreadSchema = messageThreadSchema;


/**
 * Constructor export
 */
module.exports = exports = MessageThread = mongoose.model('MessageThread', messageThreadSchema);


/**
 * Public methods
 */

//  New message. 
//    If messageThreadId included, tack it on to that thread.
//    If listingId included, create new message thread.
//    If users included, add them, otherwise default message to public
exports.post = function(criteria, onComplete) {
  var message = new Message({
      userId : criteria.author
    , timestamp : new Date()
    , message : criteria.message
  });
  message.save(function(err){
    if (criteria.messageThreadId) {
      // TODO: generate notifications
      MessageThread.update({_id : criteria.messageThreadId},{messages: {$push: message}}).run(function(err, messageThread){
        UserListing.updateNotificationsFromMessageThread(messageThread, onComplete);
      });
    } else if (criteria.listingId) {
      var args = {};
      if (criteria.users) {
        var users = [criteria.author];
        _.each(criteria.users, function(user) {
          var userId;
          if (user.length() == 32)
            userId = user;
          else if (user._id)
            userId = user._id;
          if (userId)
            users.push(userId);
        });
        args.users = users;
      }
  
      args.listingId = criteria.listingId;
      args.messages = [message];
      
      var messageThread = new MessageThread(args);
      messageThread.save(function(err){
        if (err)
          onComplete(err);
        else
          UserListing.updateNotificationsFromMessageThread(messageThread, onComplete);
      });
    } else {
      onComplete(new Error('Either messageThreadId or listingId must be sent.'));
    }

  });  
}