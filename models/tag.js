// The Tag model

/**
 * Module dependencies.
 */

var mongoose = require('mongoose')
  ,ObjectId = mongoose.Schema.Types.ObjectId;


/**
 * Tag schema
 */
var tagSchema = new mongoose.Schema({
    name: String
  , description: String
  , parentTag: ObjectId
});
exports.tagSchema = tagSchema;


/**
 * Constructor export
 */
module.exports = exports = Tag = mongoose.model('Tag', tagSchema);


/**
 * Middleware
 */
tagSchema.pre('save', function(next) {
  // store all tags in lower case
  this.name = this.name.toLowerCase();
  next();
});


/**
 * Static model methods
 */

exports.intersection = function(firstArr, secondArr) {
  var compareOne, compareTwo, found, intersection = [];
  if (firstArr)
    for (var i = 0; i < firstArr.length; i++) {
      found = false;
      if (firstArr[i] instanceof Array)
        compareOne = firstArr[i].name;
      else
        compareOne = firstArr[i];
      
      for (var j = 0; j < secondArr.length; j++) {
        if (firstArr[i] instanceof Array)
          found = (compareOne == secondArr[j].name);
        else
          found = (compareOne == secondArr[j]);
        if (found) {
          intersection.push(compareOne);
          continue;
        }
      }
    }
  return intersection;
}

exports.diff = function(firstArr, secondArr) {
  var compareOne, compareTwo, found;
  if (firstArr)
    for (var i = 0; i < firstArr.length; i++) {
      found = false;
      if (firstArr[i] instanceof Array)
        compareOne = firstArr[i].name;
      else
        compareOne = firstArr[i];
      
      for (var j = 0; j < secondArr.length; j++) {
        if (firstArr[i] instanceof Array) {
          found = (compareOne == secondArr[j].name);
        } else {
          found = (compareOne == secondArr[j]);
        }
        if (found) {
          intersection.push(compareOne);
          continue;
        }
      }
    }
  return intersection;
}
 
// terms should be an array of strings to search for
// returns an array of tags
exports.getAllByName = function() {
  var terms = arguments[0]
    , onComplete = arguments[1]
    , getParents = (arguments[2] ? arguments[2] : false);

  Tag.find({name: { $in : terms}}, function(err, tags) {
    if (getParents) {
      var async = require('async')
        ,newTags = [];
      async.forEach(tags, function(tag, callback) {
        Tag.parent(tag, function(err, newTag){
          if (newTag._id != tag._id) {
            newTags.push(newTag);
          } else {
            newTags.push(tag);
          }
          callback();
        })
      }, function(err) {
        onComplete(err, newTags);
      });
    } else {
      onComplete(err, tags);
    }
  });
}
 
exports.getByName = function(tagName, onComplete) {
  Tag.findOne({name: tagName.toLowerCase()}, function(err, tag){
    onComplete(err, tag);
  });
}

// Returns all tags
exports.getAll = function(onComplete){
  Tag.find({}).run(function(err, tags){
    onComplete(err, tags);
  });
}

// Returns all universal tags, and all tags in city sub-region
exports.getUniversalAndRegion = function(clCityRegion, onComplete) {
  clCityRegion = 'neighborhood:' + clCityRegion;
  Tag.find({$or:[{description:'universal'},{description:clCityRegion}]}).run(onComplete);
}

// Returns all tags, sorted by parent tag
exports.getAllSortedByParent = function(onComplete){
  Tag.find().sort('parentTag', 1).run(function(err, tags) {
    onComplete(err, tags);
  });
}

// Combine tags by parent tag, nest others under non-parent
exports.getNestedTags = function(onComplete){
  var tags = Tag.getAllSortedByParent(function(err, tags) {
    // we'll put all the tags that are linked to by 
    var parentTags = [];

    for (var i = 0; i < tags.length; i++) {
      if (!tags[i].parentTag) {
        if (!parentTags['no_parent']) {
          parentTags['no_parent'] = [];
          parentTags['no_parent'].children = [];
          parentTags['no_parent'].name = 'no_parent';
        }
        parentTags['no_parent'].children.push(tags[i]);
      } else {
        if (!parentTags[tags[i].parentTag]) {
          parentTags[tags[i].parentTag] = [];
          parentTags[tags[i].parentTag].children = [];
        }
        parentTags[tags[i].parentTag].children.push(tags[i]);
        for (var j = 0; j < tags.length; j++) {
          if (tags[j]._id == tags[i].parentTag.toString()) {
            parentTags[tags[i].parentTag].name = tags[j].name;
            if (parentTags['no_parent'].children.indexOf(tags[j]) != -1) {
              parentTags['no_parent'].children.splice(parentTags['no_parent'].children.indexOf(tags[j]), 1);
            }
            continue;
          }
        }
      }  
    }

    onComplete(false, parentTags);
  });
}

// Nest a tag under another tag
exports.nest = function(newParentTag, newChildTag, onComplete) {
  // lower-case-ify tags before checking/adding
  parentTagName = newParentTag.name.toLowerCase();
  childTagName = newChildTag.name.toLowerCase();
  
  // find the child tag
  if (parentTagName.length > 0 && childTagName.length > 0) {
    Tag.getByName(childTagName, function(err, childTag) {
      onCompleteChild = function(childTag) {
        console.log('child tag: ' + childTag);
        
        // find the parent tag
        Tag.getByName(parentTagName, function(err, parentTag) {
          onCompleteParent = function(parentTag) {
            onCompleteParentParent = function() {
              // update the child tag with the parent tag id
              Tag.update({_id:childTag._id},{parentTag: parentTag._id}, function(err, tag){
                onComplete();
              });
            }
  
            // if parent tag has a parent tag, recursively climb to the top one
            Tag.parent(parentTag, function(err, tag){
              parentTag = tag;
              onCompleteParentParent();
            });
          }
          if (!parentTag) {
            new Tag({name: parentTagName, description:childTag.description}).save(function() {
              Tag.findOne({name: parentTagName}, function(err, tag){
                onCompleteParent(tag);
              });
            });
          } else {
            if (!childTag.description) {
              Tag.update({_id:childTag._id},{description:parentTag.description}, function(){
                onCompleteParent(parentTag);
              });
            } else {
              onCompleteParent(parentTag);
            }
          }
        });
      }
      // if child tag does not exist, create it
      if (!childTag) {
        new Tag({name: childTagName}).save(function() {
          Tag.findOne({name: childTagName}, function(err, tag){
            onCompleteChild(tag);
          });
        });
      } else {
        onCompleteChild(childTag);
      }
    });
  } else {
    var tagname;
    if (parentTagName.length > 0) {
      tagname = parentTagName;
    } else if (childTagName.length > 0) {
      tagname = childTagName;
    }
    if (tagname.length) {
      Tag.findOne({name: tagname}, function(err, tag){
        if (!tag) {
          new Tag({name: tagname}).save(function() {
            Tag.findOne({name: tagname}, function(err, tag){
              onComplete(tag);
            });
          });
        } else {
          onComplete(tag);
        }
      });
    }
  }
}

// find parent of tag that is passed in. oh, and do it recursively. no big deal.
exports.parent = function(tag, onComplete) {
  if (tag.parentTag) {
    // returns parent tag of inputted tag
    Tag.findOne({'_id':tag.parentTag}, function(err, newTag) {
      Tag.parent(newTag, onComplete);
    });
  } else {
    onComplete(false, tag);
  }
};

exports.countListingsMatches = function(tags, listing) {
  var count = 0;

  for (var i = 0; i < listing.tags.length; i++) {
    for (var j = 0; j < tags.length; j++) {
      if (tags[j].name == listing.tags[i]) {
        count++;
        continue;
      }
    }
  }
  return count;
}

exports.getNamesFromTags = function(tags, onComplete) {
  var names = [];
  for (var i = 0; i < tags.length; i++) {
    names.push(tags[i]['name']);
  }
  if (onComplete)
    onComplete(names);
  else
    return names;
}

// PRIVATE
