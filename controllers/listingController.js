var async = require('async')
  , UserListing = require('../models/userListing.js')
  , Craigslist = require('../models/craigslist.js')
  , User = require('../models/user.js')
  , Redis = require('../lib/redis.js');

exports.update = function(req, res) {
  Craigslist.GetNewListingsFromRSS('newyork', function(err, results) {
    res.send(results);
  });
}

// primary search function for listings
exports.all = function(req, res) {
  getCriteriaFromRequest(req, function(criteria){
    if (!criteria.inbox) {
      Redis.checkCache("criteria#" + JSON.stringify(criteria)
        , function(err, args) {
          sendResponse(args);
        }
        , function() {
          PerformListingLookup(criteria, function(args) {
            Redis.saveToCache("criteria#" + JSON.stringify(criteria), args);
            sendResponse(args);
          });
        }
      );
    } else {
      // this could be cleaner, but basically skip the cache if we are getting the inbox
      PerformListingLookup(criteria, function(args) {
        sendResponse(args);
      });
    }
  });

  var sendResponse = function(args) {
    // apply any userListing parameters to the set of listings. this includes isRead, isFavorite, etc.
    if (criteria.cityRegion)
      res.local('cityRegion',criteria.cityRegion);

    if (req.user && !criteria.inbox) {
      UserListing.applyToListings(req.user._id, args.listings, function(listings) {
        args.listings = listings;
        res.send(args);
      });
    } else {
      res.send(args);
    }
  }

  function PerformListingLookup(criteria, onCompletePerformListingLookup) {
    if (criteria == {}) {
      console.log('no criteria');
      Listing.getAll(function(err, listings) {
        sendResponse(err ? err : {
            listings: assignRankings(listings)
          , criteria: criteria
        });
      });
    } else if (criteria.inbox) {
      var getInbox = function() {
        console.log('getting inbox');
        
        // get userListings
        UserListing.getInbox(req.user._id, function(err, userListings) {
          if (err)
            console.log(err);
          else {
            // apply listings to listings
            Listing.applyToUserListings(userListings, function(listings) {
              // send back
              onCompletePerformListingLookup({
                  listings: assignRankings(listings)
                , criteria: criteria
              });
            });
          }
        });      
      }
      
      if (!req.user) {
        User.checkOrCreateUser(req, res, getInbox);
      } else {
        getInbox();
      }
    } else {
      console.log(criteria);
      
      function processListings(err, listings, meta) {
        async.parallel([function(){
          // count matching tags and insert into matchCounts
          // this should be replaced by a slightly more sophisticated sorting routine
          if (listings) {
            if (criteria.tags) {
              var additionalCriteriaMatched = (criteria.locationTags ? 1 : 0) + (criteria.priceMin ? 1 : 0) + (criteria.priceMax ? 1 : 0) + (criteria.bedroomCount ? 1 : 0);
              for(var i = 0; i < listings.length; i++) {
                var matchCount = Tag.countListingsMatches(criteria.tags, listings[i]);
                if (!matchCount) {
                  matchCount = 0;
                }
                listings[i].userListingData = {
                    'matchCount': matchCount
                  , 'matchPercentage': ((matchCount + additionalCriteriaMatched) / (criteria.tags.length + additionalCriteriaMatched))
                  , 'matchPercentageString': Math.round(((matchCount + additionalCriteriaMatched) / (criteria.tags.length + additionalCriteriaMatched))*100)
                };
              }
              // sort the listings by matchcounts. this should be a little more sophisticated soon as well
              sortedListings = Listing.sortByMatchCount(listings);
  
              // insert ranking
              assignRankings(sortedListings);
            } else {
              assignRankings(listings);
              sortedListings = listings;
            }
            if (listings) {
              onCompletePerformListingLookup({
                  listings: sortedListings
                , criteria: criteria
                , meta: meta
              });
            }
          } else {
            onCompletePerformListingLookup({
                listings: null
              , criteria: criteria
              , meta: meta
            });
          }
  
        }, function() {
          // in parallel to serving the request, save the new user search tags
          if (req.user) {
            /*
            console.log('intersection:');
            
            // if there are intersecting
            var intersection = Tag.intersection(criteria.tags, req.user.criteria);
            if (intersection.length && (criteria.tags.length > req.user.criteria.length))
            */

            req.user.criteria = criteria;
            req.user.save();
            console.log(req.user);
          }
        }]);
      } // end of processListing

      Listing.getByCriteria(criteria, processListings);  
    } // end of if checking for criteria
    
  } // end of getCriteriaFromRequest
}

exports.putUserListing = function(req, res) {
  var args = {};

  var apply = function() {
    args.listingId = req.params.listingId;
    args.userId = req.user._id;

    UserListing.applyArgsToUserListing(args, function(err, userListing) {
      res.send(err?err:userListing);
    });
  }

  var params;
  if (req.method.toLowerCase() == 'get') {
    params = req.query;
  } else {
    params = req.body;
  }

  if (params.isRead)
    args.isRead = params.isRead;
  if (params.isFavorite)
    args.isFavorite = params.isFavorite;
  if (params.isArchived)
    args.isArchived = params.isArchived;

  // does user listing exist?
  if (!req.params.listingId) {
    res.send('No listing id sent. Please include the listingId in the path, ie: "/user/listing/[id]"',400);
  } else if (isEmpty(args)) {
    res.send('No param found. Please include either isRead, isFavorite, or isArchived in the query',400);
  } else if (!req.user) {
    User.checkOrCreateUser(req, res, function() {
      apply();
    })
  } else {
    apply();
  }
}

exports.allListing = function (req, res) {
  var populateAndSend = function (err, listing) {
    if (listing.fullyPopulated) {
      console.log('Listing already scraped. Sending. (' + listing._id + ')');
      res.send({listing: listing});
    } else {
      console.log('Listing not yet scraped. Scraping. (' + listing._id + ')');
      Craigslist.scrapeIndividualPage(listing.link, function(err, results) {
        listing.listingStatus = results.listingStatus;
        listing.fullyPopulated = true;
        if (results.listingStatus == 200) {
          if (!listing.images)
            listing.images = [];
          for (var i = 0; i < results.images.length; i++) {
            listing.images.push(results.images[i]);
          }
		  listing.ownerEmail = "not set yet";
		  if (results.email){
		    listing.ownerEmail = results.email;//"hello@gmail.com";	
		  }
        }
        try {
          res.send({listing: listing});
        } catch (err){
          console.log('Scrape error in listing ' + listing._id);
          console.log(err);
          console.log(new Error().stack);
        }
        Listing.updateWithScrapeResults(listing._id, results, function(err){
          console.log('Listing updated. (' + listing._id + ')');
          if (err) {
            console.log('error updating listing. (' + listing._id + ')');
            console.log(listing);
          }
        });
      });
    }
  }

  Listing.findOne({_id:req.params.id}, Listing.listingDisplayFields).populate('messageThreads').run(function(err, listing) {
    if (err || !listing) {
      res.send('Bad request', 400);
    } else if (listing.listingStatus == 200 && req.user) {
      var options = { markRead : true };
      UserListing.applyToListing(req.user._id, listing, options, populateAndSend);
    } else {
      populateAndSend(false, listing);
    }
  });
}


// private
function isEmpty(obj) {
  for(var prop in obj) {
    if(obj.hasOwnProperty(prop))
      return false;
  }
  return true;
}

function getCriteriaFromRequest(req, onComplete) {
  // pull criteria from request parameters or body
  if (req.method.toLowerCase() == 'get') {
    criteria = req.query;
  } else if (req.method.toLowerCase() == 'post') {
    criteria = req.body;
  }
  
  if (!criteria.cityRegion)
    criteria.cityRegion = req.session.cityRegion;
  if (!criteria.cityRegion)
    criteria.cityRegion = req.params.cityRegion;
  if (!criteria.cityRegion)
    criteria.cityRegion = 'washingtondc';
    
  // only grab listings from the last week, starting at midnight EST (so that date isn't different for every request, for caching purposes)
  var today = new Date();
  var lastWeek = new Date();
  lastWeek.setUTCFullYear(today.getUTCFullYear());
  lastWeek.setUTCMonth(today.getUTCMonth());
  lastWeek.setUTCDate(today.getUTCDate() - 6);
  lastWeek.setUTCHours(4); // GMT offset (not sure what to do about DST)
  lastWeek.setUTCMinutes(0);
  lastWeek.setUTCSeconds(0);
  lastWeek.setUTCMilliseconds(0);
  criteria.since = lastWeek;

  tagNamesToTags(criteria.tags, function(tags) {
    criteria.tagNames = criteria.tags;
    criteria.tags = tags;
    tagNamesToTags(criteria.locationTags, function(tags) {
      criteria.locationTagNames = criteria.locationTags;
      criteria.locationTags = tags;
      onComplete(criteria);
    });
  });
  
  function tagNamesToTags(tags, onComplete) {
    if (!tags)
      onComplete();
    else {
      // make tags into an array
      if (!(tags instanceof Array)) {
        tags = tags.toString().replace(/\s*,\s*/g, ',').split(',');
      }
      Tag.getAllByName(tags, function(err, tags){
        onComplete(tags);
      }, true);
    }
  }
}

var assignRankings = function(listings) {
  for (var i = 0; i < listings.length; i++) {
    if (!listings[i].userListingData)
      listings[i].userListingData = {};
    listings[i].userListingData.ranking = i;
  }
  return listings;
}
