/* The Tag Controller
 *
 * Routes application endpoints for working with tags
 */

// Load Models
var Tag = require('../models/tag.js')
  , Listing = require('../models/listing.js')
  , Redis = require('../lib/redis.js');

// accepts a post request with parameters for a tag
exports.post = function(req, res) {
  var description = req.body.description ? req.body.description.toLowerCase() : 'universal';
  new Tag({name: req.body.name.toLowerCase(), description: description}).save();
  res.redirect('/tag/create');
}

// sends a json array of a list of all tags
exports.get = function(req, res) {
  var cityRegion = req.query.cityRegion;

  // if not specified, use session  
  if (!cityRegion)
    cityRegion = req.session.cityRegion;

  // if still nothing, use dc
  if (!cityRegion)
    cityRegion = 'washingtondc';
  
  if (cityRegion) {
    Redis.checkCache("tags#" + cityRegion
      , function(err, tags) {
        res.send(tags);
      }
      , function() {
        Tag.getUniversalAndRegion(cityRegion, function(err, tags){
          if (err) {
            console.log(err);
            res.send(err);
          } else {
            Redis.saveToCache("tags#" + cityRegion, tags);
            res.send(tags);
          }
        });
      }
    );
  } else {
    // should never be called
    Tag.getAll(function(err, tags) {
      if (err) {
        console.log(err);
        res.send(err);
      } else {
        res.send(tags);
      }
    });
  }
}

// locates a tag by name
exports.show = function(req, res) {
  Listing.getByTagName(req.params.name, function(err, listings) {
    if (err) {
      console.log(err);
      res.send(err);
    } else {
      res.render('tag/showTag', {
        title: 'Tag: ',
        tagName: req.params.name,
        listings: listings
      });
    }
  });
}

// Gets all tags including child tags for merging
exports.renderNestForm = function(res){
  // get all tags, sort by parentTag
  Tag.getNestedTags(function(err, tags) {
    if (err) {
      console.log(err);
      res.send(err);
    } else {
      // make array of parentTags, nest child tags
      res.render('tag/nestForm', {
        title: 'Tags Nesting Form',
        tags: tags
      });
    }
  });
}

// Merges parent and child tags
exports.mergeTags = function(req, res) {
  // merge the tags
  var parentTag = {name: req.body.parentTagName};
  var childTag = {name: req.body.childTagName};
  Tag.nest(parentTag, childTag, function() {
    // redirect back to the nest form
    res.redirect('/tag/nest');
  });
}

exports.deleteParent = function(id, onComplete) {
  Tag.deleteParent(id, onComplete);
}