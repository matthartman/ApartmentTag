// The Location model;

/**
 * Module dependencies.
 */
var geocode = require('../lib/geocode.js')
  , Craigslist = require('./craigslist.js')
  , url = require('url');

/**
 * Location schema
 */
// Location is not a mongo schema, it is simply an array, since locations will only be nested within listing objects

// PUBLIC

// Constructor
//module.exports = exports = Location = mongoose.model('Location', locationSchema);

exports.getLocationFromCLDescription = function(post, onComplete) {
  var parsedURL = url.parse(post.link);
  
  var clCityRegion = parsedURL.hostname.match(/\w*/)[0];
  var clSubRegion = parsedURL.pathname.match(/\/(\w*)/\/)[1];
  if (!Craigslist.clCityRegions[clCityRegion] || !Craigslist.clCityRegions[clCityRegion].clSubRegions[clSubRegion])
    clSubRegion = null;

  var xstreet0 = post.description.split(Craigslist.CLTAGregex('xstreet0'))[1];
  var xstreet1 = post.description.split(Craigslist.CLTAGregex('xstreet1'))[1];
  var city = post.description.split(Craigslist.CLTAGregex('city'))[1];
  var region = post.description.split(Craigslist.CLTAGregex('region'))[1];
  var geographicArea = post.description.split(Craigslist.CLTAGregex('GeographicArea'))[1];

  var googleMapsLocationRegex = /http\:\/\/maps\.google\.com\/\?q=loc%3A\+([a-zA-Z+]*)"/g;
  var address = post.description.split(googleMapsLocationRegex)[1];

  var searchStr;
  if (address) {
    searchStr = address;
  } else if (xstreet0) {
    searchStr = xstreet0 + (xstreet1 ? ' at ' + xstreet1 + ', ': ' ') + (city ? city + ', ' : ' ') + Craigslist.clCityRegions[clCityRegion].clSubRegions[clSubRegion];
  } else {
    searchStr = geographicArea + ' near ' + (city ? city + ', ' : ' ') + Craigslist.clCityRegions[clCityRegion].clSubRegions[clSubRegion];
  }
  
  var skipYahoo = address ? true : false;
  geocode.geocode(searchStr, skipYahoo, function(err, data){
    if (err) {
      console.log(err);
      onComplete(err, null);
    } else {
      var location = {
          clCityRegion: clCityRegion
        , clSubRegion: clSubRegion
        , xstreet0: xstreet0
        , xstreet1: xstreet1
        , city: city
        , region: region
        , geographicArea: geographicArea
        , lat: data.lat
        , lng: data.lng
        , address: address ? address : searchStr
        , approximate: address && city && region
        , searchString: searchStr
        , searchPlatform: data.searchPlatform
      };
      
      // log odd locations for New York
      if (clCityRegion == 'newyork' &&
          (location.lat < 40.339217 || location.lat > 41.127987) &&
          (location.lng > -73.293915 || location.lng < -74.553223)) {
        console.log('Abnormal location found for post with link: ' + post.link);
      }
      
      onComplete(err, location);
    }
  });
}