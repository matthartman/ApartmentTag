// This is a controller for one-off scripts that perform some function (send out email newsletter) or modify some data (make all tags lowercase)

exports.makeTagsLowercase = function() {
  Tag = require('../models/tag.js');
  
  Tag.find({}).each(function(err, tag) {
    console.log(tag);
    if (tag) {
      Tag.update({_id:tag._id},{name:tag.name.toLowerCase()}, function(err, tag){
        console.log(tag);
      });
    }
  });
}

// might have to be run multiple times (written that way for safety sake)
exports.deleteDuplicateTags = function(res) {
  Tag = require('../models/tag.js');
  
  Tag.getAll(function(err, tags){
    require('async').forEachSeries(tags, function(tag, done) {
      Tag.find({name:tag.name}, function(err, sameTags) {
        if(sameTags.length > 1) {
          console.log('removing a copy of ' + sameTags[1].name);
          sameTags[1].remove();
        }
        done();
      });
    }, function(){
      res.send('done');
      console.log('done');
    });
  });
}

exports.assignBedroomCount = function(res) {
  var Listing = require('../models/listing.js')
    ,Tag = require('../models/tag.js');
  
  var count = 0;
  Listing.find({'tags': { '$in': ['5 bedroom'] }, bedroomCount: {'$exists': false}}).run(function(err, listings){
    require('async').forEach(listings, function(listing, done) {
      listing.bedroomCount = 5;
      listing.save(function(){count++;done();});
    }, function(){res.send(count + ' processed');});
  });
}

exports.applyTagsToListings = function(req, res) {
  var Listing = require('../models/listing.js')
    ,Tag = require('../models/tag.js');

  city = req.query.city;

  function apply(err, tags) {
    var count = 0;
    var query = {};
    if (city)
      query['clCityRegion'] = city;

    Listing.find(query).limit(10000).skip(72000).run(function(err, listings) {
      require('async').forEach(listings, function(listing, done) {
        Listing.applyTags(listing, tags, function(thisListing){
          if (!thisListing || !thisListing.title) {
            console.log(count + ' failed');
          } else {
            thisListing.save();
            if ((count % 100) == 99)
              console.log(count);
          }
          count++;
          done();
        });
      }, function(){res.send(count + ' processed');});
    });
  }
  
  if (city)
    Tag.getUniversalAndRegion(city, apply);
  else 
    Tag.getAll(apply);  
}

exports.updateParentTags = function(res) {
  var Tag = require('../models/tag.js');
  
  Tag.find(function(err, tags) {
    for (var i = 0; i < tags.length; i++) {
      Tag.findOne({_id:tags[i].parentTag}, function(err, tag){
        tags[i].parentTag = tag;
        res.send(1);
      })
    }
  });
}

exports.inserttags = function(req, res) {
  var tags = [{"name":"1 bedroom","_id":"4e28b402e91dcbb406000002"},{"name":"2 bedroom","_id":"4e28b406e91dcbb406000003"},{"name":"3 bedroom","_id":"4e28b408e91dcbb406000004"},{"name":"studio","_id":"4e28b40ce91dcbb406000005"},{"name":"wood floors","_id":"4e28b454e91dcbb406000007"},{"name":"new kitchen","_id":"4e28b457e91dcbb406000008"},{"name":"boat","_id":"4e28d3f85f7dcd620800000d"},{"name":"arlington","_id":"4e34430cae109de03200000e"},{"name":"townhouse","_id":"4e28b3b3e91dcbb406000001"},{"parentTag":"4e28b402e91dcbb406000002","name":"1br","_id":"4e28e5e6d9d5c20b0a0000b0"},{"parentTag":"4e28b402e91dcbb406000002","name":"1 br","_id":"4e345b8124d2a2b54200000f"},{"parentTag":"4e28b406e91dcbb406000003","name":"2br","_id":"4e28e5ead9d5c20b0a0000b1"},{"parentTag":"4e28b406e91dcbb406000003","name":"2 br","_id":"4e346ffdb7b61e8a4e000010"},{"parentTag":"4e28b408e91dcbb406000004","name":"3br","_id":"4e28e5ecd9d5c20b0a0000b2"},{"parentTag":"4e28b406e91dcbb406000003","name":"2 bed","_id":"4e347245e7988ca74f000051"},{"parentTag":"4e28b408e91dcbb406000004","name":"3 br","_id":"4e3473d5e1be801651000013"},{"parentTag":"4e28b408e91dcbb406000004","name":"3 bed","_id":"4e3479ec731b02355400003d"},{"parentTag":"4e28b402e91dcbb406000002","name":"1 bed","_id":"4e347aa6d1a1b32755000001"},{"parentTag":"4e28b454e91dcbb406000007","name":"hardwood floors","_id":"4e28b44fe91dcbb406000006"},{"name":"walk-in closet","_id":"4e3481e956ee625b5700002e"},{"parentTag":"4e3481e956ee625b5700002e","name":"walk-in","_id":"4e29aea93f60ac7aa824b58f"},{"parentTag":"4e28b406e91dcbb406000003","name":"2bd","_id":"4e359f7e16a914bf8f00005d"},{"parentTag":"4e28b402e91dcbb406000002","name":"1bd","_id":"4e35a26b16a914bf8f00008f"},{"parentTag":"4e28b402e91dcbb406000002","name":"1bed","_id":"4e35a26b16a914bf8f000091"},{"parentTag":null,"name":"3bd","_id":"4e35a5e516a914bf8f00015c"},{"parentTag":"4e28b40ce91dcbb406000005","name":"0br","_id":"4e39b507bbd21c143500001a"},{"parentTag":"4e28b40ce91dcbb406000005","name":"0-br","_id":"4e39b524bbd21c1435000037"}];
  for(var i = 0; i < tags.length; i++) {
    var tag = new Tag({name: tags[i].name});
    console.log('about to insert');
    console.log(tag);
    tag.save(function(err, tag) {
      console.log('inserted');
      console.log(tag);
    });
  }
}

function inputTagsFromTextFile() {
  Listing = require('./models/listing.js');
  Tag = require('./models/tag.js');
  
  var fs = require('fs');
  var array = fs.readFileSync('./junk/dcmetro.txt').toString().split("\n");
  
  require('async').forEach(array, 
  function(elem, done) {
    regex = new RegExp(elem, 'i');
    Listing.find({$or: [{title:regex}, {description: regex}]}).count(function(err, count) {
  
      if (count > 10) {
        Tag.findOne({name: elem}, function(err, tag){
          if (!tag) {
            new Tag({name: elem, description:"neighborhood:washingtondc"}).save(function() {
              Tag.findOne({name: elem}, function(err, tag){
                console.log(elem + 'inserted')
                done();
              });
            });
          } else {
            console.log(elem + 'already exists')
            done();
          }
        });
      } else {
        console.log(elem + 'rejected')
        done();
      }
    });
  },function(){console.log('done');});
}