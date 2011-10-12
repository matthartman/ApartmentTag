var redis;

exports.setup = function(app) {
  var REDIS_URI = process.env.REDIS_URI;
  console.log('Redis configured for ' + process.env.NODE_ENV);

  var redisUrl = require('url').parse(REDIS_URI)
  , redisAuth = redisUrl.auth.split(':');
  
  redis = require("redis").createClient(redisUrl.port, redisUrl.hostname);

  // auth the red is connection  
  redis.auth(redisUrl.auth.split(":")[1]);

  return redis;
}
module.exports.redis = redis;

// cache expires for listings calls in seconds
var CACHE_EXPIRE = process.env.CACHE_EXPIRE ? process.env.CACHE_EXPIRE : 60
exports.CACHE_EXPIRE = CACHE_EXPIRE;

exports.checkCache = function(key, onCompleteFound, onCompleteNotFound) {
  if (typeof key == 'object')
    key = JSON.stringify(key);
  console.log('#cache#' + key);
  redis.get('#cache#' + key, function(err, response) {
    if (response) {
      console.log('Cached version of query found.');
      onCompleteFound(false, JSON.parse(response));
    } else {
      if (err) 
        console.log(err);
      else 
        console.log('Cached version of query not found. Performing query.');
      onCompleteNotFound();
    }
  })
}

exports.saveToCache = function(key, value) {
  if (typeof key == 'object')
    key = JSON.stringify(key);
  if (typeof value == 'object')
    value = JSON.stringify(value);
  redis.set('#cache#' + key, value, function(err, response){if(err) console.log(err);});
  redis.expire('#cache#' + key, CACHE_EXPIRE, function(err, response){if(err) console.log(err);});
  console.log('Response cached: ' + '#cache#' + key);
}