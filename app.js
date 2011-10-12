/**
 * Module dependencies.
 */

var express = require('express')
  , Connect = require('connect')
  , gzip = require('connect-gzip')
  , mongooseAuth = require('mongoose-auth')
  , sys = require('sys')
  , fs = require('fs')
  , assetManager = require('connect-assetmanager')
  , assetHandler = require('connect-assetmanager-handlers')
  , root = __dirname + '/public'
  , url = require('url');

var assetManagerGroups = {
  'js': {
    route: /\/scripts.js/
    , 'path': './public/js/'
    , 'dataType': 'javascript'
    , 'files': [
/*
      'http://ajax.googleapis.com/ajax/libs/jquery/1.6.2/jquery.min.js'
      , 'jquery-ui-1.8.6.custom.min.js'
      , 'jquery.autoGrowInput.js'
      , 'jquery.rotate.1-1.js'
      , 'jquery.tagedit-1.2.0.js'
      , 'http://dev.virtualearth.net/mapcontrol/mapcontrol.ashx?v=7.0'
      , 'http://static.getclicky.com/js", type="text/javascript'
      , 'http://static.ak.fbcdn.net/connect/en_US/core.js'
      , 'jquery-tmpl.js'
*/
      , 'spin.js'
      , 'jquery.tiptip.minified.js'
      , 'inbox.js'
    ]
  }, 'css': {
    'route': /\/style.css/
    , 'path': './public/css/'
    , 'dataType': 'css'
    , 'files': [
      'jquery.tagedit.css'
      , 'jquery-ui-1.8.6.custom.css'
      , 'global.css'
      , 'tipTip.css'
    ]
    , 'preManipulate': {
      // Regexp to match user-agents including MSIE.
      'MSIE': [
        assetHandler.yuiCssOptimize
        , assetHandler.fixVendorPrefixes
        , assetHandler.fixGradients
        , assetHandler.stripDataUrlsPrefix
      ],
      // Matches all (regex start line)
      '^': [
        assetHandler.yuiCssOptimize
        , assetHandler.fixVendorPrefixes
        , assetHandler.fixGradients
        , assetHandler.replaceImageRefToBase64(root)
      ]
    }
  }
};

var app = module.exports = express.createServer();

var MONGO_URI = process.env.MONGO_URI
  , REDIS_URI = process.env.REDIS_URI;

console.log('Mongo and redis configured for ' + process.env.NODE_ENV);

  // Session store:
var RedisStore = require('connect-redis')(express)
  
  // general redis auth
  , redisUrl = url.parse(REDIS_URI)
  , redisAuth = redisUrl.auth.split(':');

// Connect to Mongo
var mongoose = require('mongoose');

// connect to mongo through mongoose
db = mongoose.connect(MONGO_URI, {auto_reconnect: true});

var User = require('./models/user.js');

// not sure if this line is necessary for mongoose-auth to work
mongoose.model('User', User.userSchema);

// not sure if this line is necessary for mongoose-auth to work
mongoose.model('User');

// Configuration
app.configure(function () {
  app.set('redisHost', redisUrl.hostname);
  app.set('redisPort', redisUrl.port);
  app.set('redisDb', redisAuth[0]);
  app.set('redisPass', redisAuth[1]);
});

// sessions last
var sessionExpire = 3600000

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({
    secret: 'E.4RcGx)Rnk@V["ENr{-W4aC_*y6)\v',
    store: new RedisStore({
        host: app.set('redisHost'),
        port: app.set('redisPort'),
        db: app.set('redisDb'),
        pass: app.set('redisPass')
    }),
  }));
    
  app.use(defaultLocals);
  app.use(assetManager(assetManagerGroups));
  app.use(gzip.gzip());
  //  , Connect.logger() // Log responses to the terminal using Common Log Format.
  app.use(Connect.responseTime()); // Add a special header with timing information.
  //    Connect.utils.conditionalGET(), // Add HTTP 304 responses to save even more bandwidth.
  app.use(Connect.static(root)); // Serve all static files in the current dir.
  app.use(Connect.staticCache(root));
  app.use(mongooseAuth.middleware());
  app.use(express.static(root));
});

// add dynamic view helpers for express
mongooseAuth.helpExpress(app);

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('staging', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
//  app.use(express.errorHandler()); 
});

// CONTROLLERS

var homeController = require('./controllers/homeController.js')
  , tagController = require('./controllers/tagController.js')
  , listingController = require('./controllers/listingController.js')
  , messageController = require('./controllers/messageController.js')
  , mailController = require('./controllers/mailController.js')

// ROUTES

// Route Middleware

// if user doesn't exist, create one
function checkUser(req, res, next) {
  if (!req.user && req.session && (req.session.tempUser || req.session.auth)) {
    if (req.session.tempUser)
      userId = req.session.tempUser.userId;
    else
      userId = req.session.auth.userId;
    User.findById(userId, function(err, user) {
      req.user = user;
      next();
    });
  } else {
    next();
  }
}

// check region user is searching in
function checkRegion(req, res, next) {
  if (req.params.regionAbbrev && clCityRegionAbbreviations[req.params.regionAbbrev] != undefined){
    req.session.cityRegion = clCityRegionAbbreviations[req.params.regionAbbrev];
  }
//  console.log(req.session);
  next();
}

function homeReRoute(req, res, next) {
  if (!req.params.regionAbbrev && req.session.cityRegion)
    res.redirect('/' + req.session.cityRegion);
  else
    next();
}

// add this middleware function to any routes that require the user to be an admin to access
function requireAdmin(req, res, next) {
  next();
}

function requireLogin(req, res, next) {
  if (req.user)
    next();
  else
    next(new Error('You must be logged in to access this method.'));
}

function setProductionVar(req, res, next) {
  res.locals({
      'environment' : process.env.NODE_ENV
    , 'cityRegion' : (req.session && req.session.cityRegion)?req.session.cityRegion:'washingtondc'
  });
  next();
}

function defaultLocals(req, res, next) {
  res.locals({environment: false, cityRegion: false});
  next();
}

var beforeRoute = [defaultLocals, checkUser, checkRegion, setProductionVar];

// Homepage
var clCityRegionAbbreviations = {
    'ny' : 'newyork'
  , 'dc' : 'washingtondc'
  , 'chi' : 'chicago'
  , 'newyork' : 'newyork'
  , 'nyc' : 'newyork'
  , 'chicago' : 'chicago'
  , 'washingtondc' : 'washingtondc'
};

var clCityRegionMatches = [
    ''
  , 'ny'
  , 'dc'
  , 'chi'
  , 'newyork'
  , 'chicago'
  , 'washingtondc'
];

app.get('/:regionAbbrev?', beforeRoute, function(req, res, next) {
  if (!req.params.regionAbbrev || clCityRegionAbbreviations[req.params.regionAbbrev] != undefined){
    req.params.cityRegion = clCityRegionAbbreviations[req.params.regionAbbrev];
    
    // if nothing is specified and no cityRegion has yet been set, default to washingtondc
    if (!req.params.regionAbbrev && !req.session.cityRegion) {
      req.session.cityRegion = 'washingtondc';
    }
    homeController.inbox(req, res);
  } else
    next();
});

// Get listings
app.all('/listings', beforeRoute, function(req, res) {
  listingController.all(req, res);
});

var req1 = null;
app.all('/listing/:id', beforeRoute, function(req, res) {
  listingController.allListing(req, res);
});

// Get tags
app.get('/tags', beforeRoute, function(req, res) {
  tagController.get(req, res);
});

// Test email
app.get('/testemail', beforeRoute, function(req, res) {
  mailController.sendMail(req, res);
});


app.put('/user/listing/:listingId', beforeRoute, function(req, res) {
  listingController.putUserListing(req, res);
});

app.all('/messages', beforeRoute, requireLogin, function(req, res) {
  messageController.all(req, res);
});

// admin functions only available on development
if (process.env.NODE_ENV == 'development') {
  app.get('/login', beforeRoute, function(req, res){
    res.render('login');
  });

  app.get('/listings/update', beforeRoute, requireAdmin, function(req, res) {
    listingController.update(req, res);
  });
  
  app.get('/tag/nest', beforeRoute, requireAdmin, function(req, res) {
    tagController.renderNestForm(res);
  });
  app.post('/tag/nest', beforeRoute, requireAdmin, function(req, res) {
    tagController.mergeTags(req, res);
  });
  app.get('/tag/create', beforeRoute, function(req, res) {
    res.render('tag/createTag', {
      title: 'Input new tag'
    });
  });
  app.get('/tag/:name?', beforeRoute, function(req, res) {
    if (req.params.name)
      tagController.show(req, res);
    else
      tagController.list(req, res);
  });
  app.post('/tag', beforeRoute, function(req, res) {
    tagController.post(req,res);
  });
  app.delete('/tag/:id/parent', beforeRoute, requireAdmin, function(req, res) {
    tagController.deleteParent(req.params.id, function(err, tag) {
        res.send(err ? err : tag);
    });
  });
  app.get('/assignBedroomCount', function(req, res) {
    require('./controllers/scriptsController.js').assignBedroomCount(res);
  });
  app.get('/applyTagsToListings', function(req,res) {
    require('./controllers/scriptsController.js').applyTagsToListings(req, res);
  });
  app.get('/deleteDuplicateTags', function(req,res) {
    require('./controllers/scriptsController.js').deleteDuplicateTags(res);
  });
}

var port = process.env.PORT || 3000;
app.listen(port);
console.log("Express server listening on port %d in %s mode", app.address().port, process.env.NODE_ENV);