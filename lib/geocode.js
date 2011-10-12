var yahoo = require('./yahooPlaceFinder.js')
  , gm = require('googlemaps');

exports.geocode = function() {
  var string, skipYahoo, onComplete;

  string = arguments[0];
  if (arguments[1] instanceof Function) {
    skipYahoo = false;
    onComplete = arguments[1];
  } else {
    skipYahoo = arguments[1];
    onComplete = arguments[2];
  }

  if (skipYahoo) {
    google(string, function(err, results){
      if (!err && results) {
        onComplete(false, results);
      } else {
        console.log('Yahoo successful.');
        searchYahoo(string, onComplete);
      }
    });
  } else {
    searchYahoo(string, function(err, results) {
      if (!err && results) {
        onComplete(false, results);
      } else {
        console.log('Google successful.');
        google(string, onComplete);
      }
    });
  }
}

function google(string, onComplete) {
  gm.geocode(string, function(err, data){
    if (err || data.results.length <= 0) {
      if (data.status == 'OVER_QUERY_LIMIT')
        console.log('Google OVER_QUERY_LIMIT.');
      else 
        console.log('Google error.');
      onComplete(err ? err : data.status, null);
    } else {
      onComplete(false, {lat: data.results[0].geometry.location.lat, lng: data.results[0].geometry.location.lng, searchPlatform: 'google'});
    }
  });
}

function searchYahoo(string, onComplete) {
  yahoo.decode(string, function(err, results) {
    if (!err && !results.ResultSet.Error && results.ResultSet.Found > 0) {
      onComplete(false, {lat: results.ResultSet.Results[0].latitude, lng: results.ResultSet.Results[0].longitude, searchPlatform: 'yahoo'});
    } else {
      console.log('Yahoo error returned. Trying Google. (query: ' + string + ')');
      onComplete(err ? err : (results && results.ResultSet ? results.ResultSet.Error : null), null);
    }
  });
}