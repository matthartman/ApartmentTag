/* The Home controller
*/

exports.inbox = function(req, res) {
  var data = {
    criteria: {}
  };

  if (req.user && req.user.criteria)
    data.criteria = req.user.criteria;
    
  // set the cityRegion for this user if assigned
  data.cityRegion = req.session.cityRegion;

  console.log(data);
  
  res.render('showall', data);
}


// PRIVATE