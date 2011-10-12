var nodeio = require('node.io')
  , options = {timeout: 10, silent:true};
  
/**
* LISTINGSTATUS CODES
* 200 - OK
* 800 - SPAM
* 801 - DELETED BY AUTHOR
**/

exports.job = new nodeio.Job(options, {
  run: function (url) {
    this.getHtml(url, function(err, $) {
      var results = {};
      if ($('h2', false, true) && /This posting has been flagged for removal./.test($('h2').text)) {
        results.listingStatus = 800;
        results.error = "This posting has been flagged for removal.";
      } else if ($('h2', false, true) && /This posting has been deleted by its author./.test($('h2').text)) {
        results.listingStatus = 801;
        results.error = "This posting has been deleted by its author.";
      } else {      
        results.listingStatus = 200;
        results.userbody = $('div#userbody').innerHTML;
        results.images = [];
        $('a').each('href', function(href) {
          if (/mailto:/.test(href)) {
			results.email = "undetermined";
			var emailAddress = href.replace(/mailto:/,'').replace(/\?.*/,'');
			if (emailAddress.length == 0){
				results.email = "length was zero."; //test@gmail.com
			} else {
				results.email = emailAddress;
			}
            	
			
          }
        });

        if ($('table img', false, true) && !$('table').length && $('table').attribs.summary == 'craigslist hosted images') {
          if ($('table img').length) {
            $('table img').each('src', function(src) {
              if (/http:\/\/images.craigslist.org\//.test(src)) {
                results.images.push(src);
              }
            });
          } else {
            if (/http:\/\/images.craigslist.org\//.test($('table img').attribs.src)) {
              results.images.push($('table img').attribs.src);
            }
          }
        }
      }
      this.emit(results);
    });
  }
});