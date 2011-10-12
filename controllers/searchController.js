/** 
 * The Serach controller
 *
 * Unused at the moment.
 *
*/

var Listing = require('../models/listing.js')
  ,Tag = require('../models/tag.js')
  ,async = require('async');

exports.search = function(req, res) {
  var terms;

  if ((req.method.toLowerCase() == 'get') && !(req.session && req.session.user && req.session.user.searchTags)) {
    res.render('search',{
      title: 'Search',
      terms: false,
      tags: [],
      listings: [],
      matchCounts : []
    });
    return;
  } else if ((req.method.toLowerCase() == 'get') && (req.session && req.session.user && req.session.user.searchTags)) {
    // if no terms sent (because it's a GET request), use session's last set of terms
    terms = [];
    for (var i = 0; i < req.session.user.searchTags.length; i++) {
      terms.push(req.session.user.searchTags[i].name);
    }
  } else if ((req.method.toLowerCase() == 'post') && req.body.searchString) {
    // pull out search terms from the request
    // use the regex to get rid of spaces around commas, so we don't have spaces on either side of terms
    terms = req.body.searchString.replace(/\s*,\s*/g, ',').split(',');
  } else if ((req.method.toLowerCase() == 'post') && req.body.terms) {
    terms = [];
    for (var i = 0; i < req.body.terms.length; i++) {
      terms.push(req.body.terms[i].toString());
    }
  }
  console.log(terms);

  Tag.getAllByName(terms, function(err, tags) {
    async.parallel([function(){
      Listing.getByTags(tags, function(err, listings) {
        var matchCounts = [];
        
        for(var i = 0; i < listings.length; i++) {
          matchCounts[listings[i]._id] = Tag.countListingsMatches(tags, listings[i]);
        }
        
        sortedListings = Listing.sortByMatchCount(listings, matchCounts);
      
        if (req.params.format && req.params.format.match(/.*json/)) {
          res.send(listings);
        } else {
          res.render('search',{
            title: 'Search',
            listings: sortedListings,
            terms: terms,
            tags: tags,
            matchCounts: matchCounts
          });  
        }
      });
    }, function(){
      if (req.user) {
        req.user.searchTags = Tag.getNamesFromTags(tags);
        req.user.save();
        console.log('tags saved');
      }
      console.log(req.user);
    }]);
  }, true);
}