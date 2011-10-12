var Message = require('../models/message.js');

exports.all = function (req, res) {
  if (req.method.toLowerCase() == 'get') {
    // parse request parameters
    // perform search
    criteria = req.query;
  } else if (req.method.toLowerCase() == 'post') {
	//send message
	mailController.sendQuestion("test question");



    // create new message
    criteria = req.body;
    criteria.author = req.user._id;
    MessageThread.post(criteria, function(err, message){
      res.send(err?err:message);
    });
  }
}