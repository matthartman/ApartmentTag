// The Notification model

/**
 * Module dependencies.
 */

var mongoose = require('mongoose')
  ,ObjectId = mongoose.Schema.Types.ObjectId;


/**
 * Notification schema
 */
var notificationSchema = new mongoose.Schema({
    message: String
  , isUnread: { type: Boolean, default: true }
  , date: { type: Date, default: Date.now }
  , userId: ObjectId
  , listingId: ObjectId
  , notificationType: {type: String, enum: ['favorite', 'message']}
});
exports.notificationSchema = notificationSchema;


/**
 * Constructor export
 */
module.exports = exports = Notification = mongoose.model('Notification', notificationSchema);

/**
 * Public methods
 */
 
exports.create = function(data, onComplete) {
  var notification = new Notification(data).save(function(err) {
    data.isUnread = true;
    Notification.findOne(data, function(err, notification) {
      onComplete(err, notification);
    });
  });
}