/**
* The Listing model;
*
* LISTINGSTATUS CODES for listing.listingStatus
* 200 - OK
*
* 800 - SPAM
* 801 - DELETED BY AUTHOR
*
**/


/**
 * Module dependencies.
 */
var mongoose = require('mongoose')
  , ObjectId = mongoose.Schema.Types.ObjectId
  , Tag = require('./tag.js')
  , Redis = require('../lib/redis.js');

/**
 * Listing schema
 */
var listingSchema = new mongoose.Schema({
    title: String
  , craigslistId: String
  , link: String
  , description: String
  , date: Date
  , language: String
  , type: String
  , rights: String
  , price: Number
  , bedroomCount: Number
  , sqft: String
  , tags: [String]
  , location: Array
  , images: [String]
  , clCityRegion: String
  , messageThreads: [{ type: ObjectId, ref: 'MessageThread' }]
  , fullyPopulated : { type: Boolean, default: false }
  , ownerId: { type: ObjectId, ref: 'User' }
  , ownerEmail: String
  , listingStatus: { type : Number, default : 200 }
  , userListingData: {} // note that this shouldn't be saved. it's just a hacky way to store isRead, etc.
});
mongoose.model('Listing', listingSchema);
exports.listingSchema = listingSchema;


// PUBLIC

// Constructor
module.exports = exports = Listing = mongoose.model('Listing');

exports.getAll = function(onComplete) {
  getByCriteria({}, onComplete);
}

var searchDisplayFields = exports.searchDisplayFields = {description:0, images:0, type:0, rights:0, language:0, craigslistId: 0, ownerEmail: 0}
  , listingDisplayFields = exports.listingDisplayFields = {type: 0, rights: 0, language: 0, craigslistId: 0, ownerEmail: 0};

// Search the listing and apply tags 
// @param tags: set of tags to loop through and apply
exports.applyTags = function applyTags(listing, tags, onComplete) {
  if (!tags) {
    console.log('Error: no tags provided to apply.');
    return;
  }
  if (!listing || !listing.title || !listing.description) {
    onComplete();
  } else {
    require('async').forEach(tags, 
      function(tag, callback){
        // note: the "s?" indicates it's okay to have an s on the end, so "townhouse" matches "townhouses". this may be an issue at some point
        var tagRegex = new RegExp("(\\b)" + tag.name + "s?(?=\\s|$|\\b)", 'i');
        if (listing.title.search(tagRegex) > -1 || listing.description.search(tagRegex) > -1) {
          Tag.parent(tag, function(err, tag) {
            if (!includes(listing.tags, tag.name))
              listing.tags.push(tag.name);
            callback();
          });
        } else {
          callback();
        }
      },
      function(err) {
        onComplete(listing);
      }
    );
  }
}

// main search function
exports.getByCriteria = function(criteria, onComplete) {
  function reduceByTags(err, listings, meta) {
    console.log((listings ? listings.length : 0) + ' listings sent');
    
    // sort, reduce
    onComplete(err, listings, meta);
  }

  buildQuery(criteria, function(query) {
    Listing.getByQuery(query, reduceByTags);
  });
}

exports.getByQuery = function(query, onComplete) {
  if (query)
    console.log(query);

/*
  Redis.checkCache(query
    , onComplete
    , function() {
    */
      Listing.find(query,searchDisplayFields).populate('messageThreads').limit(250).sort('date',-1).run(function(err, theseListings) {
        listings = theseListings;
//        Redis.saveToCache(query, listings);
        onComplete(err, listings);
      });
//  });
}

buildQuery = function(criteria, onComplete) {
  var query = {};
  
  if (criteria.cityRegion)
    query['clCityRegion'] = criteria.cityRegion;

  if (criteria.since)
    query['date'] = {'$gte' : criteria.since};
  
  if (criteria.priceMin && criteria.priceMax) {
    var high = criteria.priceMax * 1.04
    , low = criteria.priceMin * 0.96;
    query['price'] = {'$gt': low, '$lt': high};
  }
  
  if (criteria.bedroomCount) {
    query['bedroomCount'] = {'$gte' : criteria.bedroomCount};
  }
  
//  query['location.xstreet0'] = {'$exists':true};

  if (criteria.locationTags && criteria.locationTags.length) {
    Tag.getNamesFromTags(criteria.locationTags, function(tagNames) {
      query['tags'] = { '$in' : tagNames };
      onComplete(query);
    });
  } else {
    onComplete(query);
  }
}

exports.getByPrice = function(criteria, onComplete) {
  var high = criteria.priceMax * 1.04
    , low = criteria.priceMin * 0.96;
  Listing.find({price: {'$gt': low, '$lt': high}}).limit(100).sort('date',-1).run(onComplete);
}

exports.getByTags = function(tags, onComplete) {
  Tag.getNamesFromTags(tags, function(tagNames) {
    Listing.getByTagNames(tagNames, onComplete);
  });
}

exports.getByTagNames = function(tagNames, onComplete) {
  Listing.find({'tags': { $in: tagNames } }).limit(100).sort('date',-1).run(onComplete);
};

exports.getByTagName = function(tagName, onComplete) {
  Listing.find({'tags': tagName}).limit(100).sort('date',1).run(onComplete);
}

exports.getByTag = function(tag, onComplete) {
  Listing.getByTagName(tag.name, onComplete);
}

exports.sortByMatchCount = function(listings) {
  return listings.sort(function(a, b){
    return b.userListingData.matchCount - a.userListingData.matchCount;
  });
}

exports.getIdsFromListings = function(listings, onComplete) {
  var ids = [];
  for (var i = 0; i < listings.length; i++) {
    ids.push(listings[i]._id);
  }
  if (onComplete)
    onComplete(ids);
  else
    return ids;
}

exports.applyToUserListings = function(userListings, onComplete) {
  var listingIds = []
    , listings = [];
  for (var i = 0; i < userListings.length; i++) {
    listingIds.push(userListings[i].listingId);
  }
  Listing.find({_id: {$in : listingIds} },searchDisplayFields).populate('messageThreads').run(function(err, returnListings) {
    for (var i = 0; i < userListings.length; i++) {
      for (var j = 0; j < returnListings.length; j++) {
        if (returnListings[j]._id.toString() == userListings[i].listingId.toString()) {
          UserListing.mergeUserListingIntoListing(userListings[i], returnListings[j]);
          listings.push(returnListings[j]);
        };
        continue;
      }
    }
    onComplete(listings);
  });
}

exports.updateWithScrapeResults = function (listingId, results, onComplete) {
  Listing.update({_id: listingId}, { 
      $pushAll : { images : results.images }
    , fullyPopulated: true
    , ownerEmail : results.email
    , listingStatus: results.listingStatus 
  }, function(err) {
    onComplete(err);
  });
}

// PRIVATE

function includes(arr, obj) {
  for(var i=0; i<arr.length; i++) {
    if (arr[i] == obj) return true;
  }
}

function objectLength(obj) {
  var result = 0;
  for(var prop in obj) {
    if (obj.hasOwnProperty(prop)) {
    // or Object.prototype.hasOwnProperty.call(obj, prop)
      result++;
    }
  }
  return result;
}