// Configurations based on environment
if (process.env.NODE_ENV == 'production' || process.env.NODE_ENV == 'staging') {
  var mongooseAuth = require('mongoose-auth');

  // production database
  if (process.env.MONGO_URI_CRON)
    var MONGO_URI = process.env.MONGO_URI_CRON;
  else
    var MONGO_URI = process.env.MONGO_URI;

  // Connect to Mongo
  var mongoose = require('mongoose');
  
  // connect to mongo through mongoose
  db = mongoose.connect(MONGO_URI);
  
  var craigslist = require('./models/craigslist.js')
    , cron = require('cron'), sys = require('sys')
    , getListings;

  if (process.env.NODE_ENV == 'staging')
    getListings = craigslist.ReplaceListingsFromCraigslist;
  else
    getListings = craigslist.GetNewListingsFromRSS;

  // washigntondc
  var cron = require('cron'), sys = require('sys');
  new cron.CronJob('0 */15 * * * *', function(){
    console.log('Running new cron. Current time: ' + (new Date().toString()));
    console.log('Pulling RSS for washingtondc.');
    getListings('washingtondc', function(err, results) {
      console.log('Cron completed pulling RSS feed: washingtondc');
    });
  });
  
  // newyork
  new cron.CronJob('0 5,20,35,50 * * * *', function(){
    console.log('Running new cron. Current time: ' + (new Date().toString()));
    console.log('Pulling RSS for newyork.');
    getListings('newyork', function(err, results) {
      console.log('Cron completed pulling RSS feed: newyork');
    });
  });
  
  // chicago
  new cron.CronJob('0 10,25,40,55 * * * *', function() {
    console.log('Running new cron. Current time: ' + (new Date().toString()));
    console.log('Pulling RSS for chicago.');
    getListings('chicago', function(err, results) {
      console.log('Cron completed pulling RSS feed: chicago');
    });
  });
  console.log('Cron set up for environment: ' + process.env.NODE_ENV);
} else {
  console.log('Cron NOT set up for environment: ' + process.env.NODE_ENV + '. Entering infinite loop for this process.');
  while(true){}
}