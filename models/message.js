// The Message model

/**
 * Module dependencies.
 */

var mongoose = require('mongoose')
  , ObjectId = mongoose.Schema.Types.ObjectId
  , User = require('./user.js');


/**
 * Message schema
 */
var messageSchema = new mongoose.Schema({
    userId: ObjectId
  , timestamp: Date
  , message: String
});
exports.messageSchema = messageSchema;


/**
 * Constructor export
 */
module.exports = exports = Message = mongoose.model('Message', messageSchema);