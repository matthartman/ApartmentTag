//var rss = require('easyrss')
var rss = require('../lib/node-rss.js')
  ,sys = require('sys')
  ,inspect = require('util').inspect
  ,Listing = require('./listing.js')
  ,Tag = require('./tag.js')
  ,Location = require('./location.js')
  ,async = require('async')
  ,Craigslist = this
  ,redis = require('../lib/redis.js').setup()
  ,url = require('url');

// Constants

var clCityRegions = {
  'washingtondc' : {
      name: 'Washington, D.C.'
    , clSubRegions: {
        'doc' : 'District of Columbia'
      , 'nva' : 'Northern Virginia'
      , 'mld' : 'Maryland'
    }
    , rss : 'http://washingtondc.craigslist.org/apa/index.rss'
    , routerAbbreviation : 'dc'
  }
  , 'chicago' : {
      name: 'Chicago, IL'
    , rss: 'http://chicago.craigslist.org/apa/index.rss'
    , clSubRegions: {
        'chc' : 'City of Chicago'
      , 'nch' : 'North Chicagoland'
      , 'wcl' : 'West Chicagoland'
      , 'sox' : 'South Chicagoland'
      , 'nwi' : 'Northwest Indiana'
      , 'nwc' : 'Northwest Suburbs'
    }
    , routerAbbreviation : 'chi'
  }
  , 'newyork' : {
      name: 'New York, NY'
    , rss : 'http://newyork.craigslist.org/abo/index.rss'
    , clSubRegions: {
        'mnh' : 'Manhattan, NY'
      , 'brx' : 'Bronx, NY'
      , 'que' : 'Queens, NY'
      , 'jay' : 'New Jersey, NY'
      , 'brk' : 'Brooklyn, NY'
      , 'stn' : 'Staten Island, NY'
      , 'lgi' : 'Long Island, NY'
      , 'wch' : 'Westchester, NY'
      , 'fct' : 'Fairfield, NY'
    }
    , routerAbbreviation : 'ny'
  }
};
exports.clCityRegions = clCityRegions;

exports.ReplaceListingsFromCraigslist = function(region, onComplete) {
  Listing.remove({clCityRegion: region},function(err) {
    Craigslist.GetNewListingsFromRSS(region, onComplete);
  });
}
  
exports.GetNewListingsFromRSS = function(region, onComplete) {
  var clCityRegion = region;
  var regionURL = clCityRegions[clCityRegion].rss;

  var insertCount = 0;
  var ignoreCount = 0;
  var processCount = 0;
  var errorCount = 0;

  var lastMax = new Date(0);
  var newMax = new Date(0);

  // all tags, to be applied to new posts
  var tags = [];

  rss.parseURL(regionURL, function() {
    if (arguments.length == 2) {
      var posts = arguments[1];
      var err = arguments[0];
    } else {
      var posts = arguments[0];
      var err = null;
    }
  
    if (err) {
      console.log(err);
      // log the error. if we still got some posts, process them
      if (!posts || posts.length <= 0) {
        // if we didn't get any posts, quit
        onComplete(err);
      }
    }

    // get a list of all tags, so that we can check each new listing for them
    // creating a new anonymous function, so that this is non-blocking and won't slow the rest of the application
    Tag.getUniversalAndRegion(clCityRegion, function(err, allTags) {
      if (err) {
        console.log('error getting all tags:');
        console.log(err);
      }
      tags = allTags;

      // pop the last time this was pulled from the range of logged date values
      redis.lrange(clCityRegion + ":update:latestPost", -1, -1, function(err, response) {
        if (err) {
          console.log('error getting redis max key');
        }

        // max date from last time rss was pulled
        lastMax = response[0];
        
        // newMax will retain the date of the latest post, and is stored, then becomes lastMax next time rss is pulled
        newMax = lastMax;

        async.forEach(posts,
          // call this function for each post
          processPost,
          // call this function after all the posts are done
          function(err){
            async.parallel([ assignRedisValues, returnResults ]);
          } // callback function from foreach
        ); // async.foreach
      }); // redis get last
    }); // tag getall
  }); // rss get
  
  var processPost = function(post, callback){
    processCount++;
    // if the date of this post is greater than the date of the lastMax date
    var insert = new Date(lastMax) < new Date(post['dc:date']);
    
    // only insert if this is a new post
    if (!insert) {
      // ignore this post
      ignoreCount++;
      callback();
    } else {
      // insert post
      var craigslistId = getCraigslistId(post.link);
      
      var info = getStandardInfoFromTitle(post.title);
      
      // create new listing model
      var listing = new Listing({
//          title: truncateTitle(post.title)
          title: info.newTitle
        , link: post.link
        , description: post.description
        , date: new Date(post['dc:date'])
        , language: post['dc:language']
        , rights: post['dc:rights']
        , type: post['dc:type']
        , craigslistId: craigslistId
        , price: info.price
        , images: getImages(post.description)
        , sqft: info.sqft
        , bedroomCount: info.bedroomCount
        , clCityRegion: clCityRegion
      });
      
      // apply bedrooms if it's in title, since we modify the title before sending it to applyTags
      if (listing.bedroomCount)
        listing.tags.push(listing.bedroomCount + ' bedroom');
  
      // Get the location (address, lat, lng, etc.) for the listing. non-blocking because it contains external api calls for geocoding
      Location.getLocationFromCLDescription(post, function(err, location) {
        if (!err) {
          listing.location = location;
        } else {
          console.log('error getting location');
        }
  
        
        // apply the tags to the new listing. this is non-blocking because parent tags are checked for
        Listing.applyTags(listing, tags, function(listingWithTags) {
          listing = listingWithTags;

          // saves the new listing to the database
          // TODO: add error checking with a return function
          listing.save(function(err) {
            if (err) {
              console.log('error saving document:');
              console.log(err);
              errorCount++;
            } else {
              // iterate counter
              insertCount++;
              
              // save the date of the newest post
              // only do this for successfully inserted tags
              if (new Date(post['dc:date']) > new Date(newMax))
                newMax = new Date(post['dc:date']);
            }
            
            // done with this listing
            callback();
          });
        
        });
      });
    }
  }
  
  var assignRedisValues = function(){
    // if this is the first time this is run for a certain region, use current time as starting place
    if (newMax == undefined) {
      console.log('newMax not found. initializing.');
      newMax = new Date();
    }
      
    redis.multi([
      ["rpush", clCityRegion + ":update:date", new Date()]
      , ["rpush", clCityRegion + ":update:insertCount", insertCount]
      , ["rpush", clCityRegion + ":update:errorCount", errorCount]
      , ["rpush", clCityRegion + ":update:errorCount", errorCount]
      , ["rpush", clCityRegion + ":update:ignoreCount", ignoreCount]
      , ["rpush", clCityRegion + ":update:processCount", processCount]
      , ["rpush", clCityRegion + ":update:latestPost", newMax.toString()]
    ]).exec(function (err, replies) {
      if (err) console.log(err);
    });
  }
  
  var returnResults = function(){
    var results = {
      insertCount: insertCount,
      processCount: processCount,
      ignoreCount: ignoreCount,
      errorCount: errorCount,
      latestPost: newMax.toString(),
      regionURL: regionURL
    };
    console.log(results);
    onComplete(false, results);
  }
}

exports.CLTAGregex = function(str) {
  return new RegExp('<!-- CLTAG ' + str + '=([\\w.,\/\\-()# ]+) -->','gi');
}

exports.scrapeIndividualPage = function(url, onComplete) {
  var exec = require("child_process").exec('echo ' + url + ' | node.io models/scrapers/craigslistPost.js');
  exec.stdout.on('data', function (data) {
    exec.stdin.end();
    try {
      var results = JSON.parse(data);
      onComplete(false, results);
    } catch(err) {
      onComplete(err, data);
    }
  });
}

// Private

function getImages(str) {
  var images = [];
  var imgRegex = /img .*?src="(http:\/\/[a-z.\/?=%0-9_&;-]*)/gi;
  var imgRegex2 = /http:\/\/[a-z.\/?=%0-9_&;-]*/gi;
  var matches = str.match(imgRegex);
  if (matches) {
    for (var i = 0; i < matches.length; i++) {
      images.push(matches[i].match(imgRegex2)[0]);
    }
  }
  return images;
}

// Search the title and description for a price, apply it if found
function getPrice(listing) {
  var price = priceFromString(listing.title);
  
  // if we found a price in the title, continue as assigned. if not, check the description
  if (!price) {
    // check the description second, and pull the maximum matching currency number
    price = priceFromString(listing.description);
  }
  
  return price;
}

// returns the first number in a string, which seems to fit craigslist ids
function getCraigslistId(str) {
  var linkRegex = /\d+/;
  var id = str.match(linkRegex);
  return id[0];
}

// Gets price from inputted string
function priceFromString(str) {
  // this pulls out any simple currency strings including the "$"
  var priceRegex = /\B\$\d+\b/;
  
  // this strips out the $
  var stripDollarSignRegex = /\d+/;
  
  // check the string, and pull the maximum matching currency number
  var prices = str.match(priceRegex);
  
  if (prices && prices.length) {
    var intPrices = [];
    
    // strip the dollar signs out of each price, so we're left with integers
    for(var i = 0; i < prices.length; i++) {
      intPrices[i] = prices[i].match(stripDollarSignRegex);
    }
    
    // take the max of those integers, and call that the price
    var price = Math.max.apply( Math, intPrices );
    return price;
  } else {
    return null;
  }
}

function getStandardInfoFromTitle(str) {
  var info = {};
  info.originalTitle = str;
  
  var regex1 = / ([0-9]*)sqft$/;
  var match = str.match(regex1);
  if (match) {
    info.sqft = match[1];
    str = str.replace(regex1,'');
  }

  var regex2 = / ([0-9]*)bd$/;
  match = str.match(regex2);
  if (match) {
    info.bedroomCount = match[1];
    str = str.replace(regex2,'');
  }

  var regex3 = / \$([0-9]*)$/;
  match = str.match(regex3);
  if (match) {
    info.price = match[1];
    str = str.replace(regex3,'');
  }

  var regex4 = / \((.*)\)$/;
  match = str.match(regex4);
  if (match) {
    info.geographicArea = match[1];
    str = str.replace(regex4,'');
  }
  
  info.newTitle = str;
  return info;
}

function includes(arr, obj) {
  for(var i=0; i<arr.length; i++) {
    if (arr[i] == obj) return true;
  }
}
