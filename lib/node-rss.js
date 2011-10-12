/**********************************************************************
 node-rss - an RSS parser for node.
 http://github.com/ibrow/node-rss

 Copyright (c) 2010 Rob Searles
 http://www.robsearles.com
 
 node-rss is released under the MIT license
  - see LICENSE for more info

 *********************************************************************
 node-rss makes heavy use of the node-xml module written by 
 Rob Righter - @robrighter
 http://github.com/robrighter/node-xml
**********************************************************************/
var sys = require('sys'), http = require('http');

// REVERT THIS FILE OR FIND IT SOMEWHERE TO GET THE PARSER FUNCTIONALITY BACK. HEAVILY HACKED TO WORK WITH xml2json


// variable for holding the callback function which is passed to the
// exported function. This callback is passed the articles array
var callback = function() {};

/**
 * parseFile()
 * Parses an RSS feed from a file. 
 * @param file - path to the RSS feed file
 * @param cb - callback function to be triggered at end of parsing
 */
exports.parseFile = function(file, cb) {
    callback = cb;
    parser.parseFile(file);
}
/**
 * parseURL()
 * Parses an RSS feed from a URL. 
 * @param url - URL of the RSS feed file
 * @param cb - callback function to be triggered at end of parsing
 *
 * @TODO - decent error checking
 */
exports.parseURL = function(url, cb) {
  callback = cb;

  get_rss(url);
  function get_rss(url) {
  	var u = require('url'), http = require('http');
  	var parts = u.parse(url);
  
  	// set the default port to 80
  	if(!parts.port) { parts.port = 80; }
  	
  	var redirection_level = 0
   	  ,client = http.createClient(parts.port, parts.hostname)
  	  ,request = client.request('GET', parts.pathname, {'host': parts.hostname});
  
  	request.addListener('response', function (response) {
      // check to see the type of status
      switch(response.statusCode) {
    		// check for ALL OK
  	    case 200:
      		var body = ''; 
      		response.addListener('data', function (chunk) {
      		    body += chunk;
      		});
      		response.addListener('end', function() {
            var parser = require('xml2json');
            
            var json = parser.toJson(body); //returns an string containing the json structure by default
            var items = JSON.parse(json);
            callback(null, items['rdf:RDF'].item);
      		});
      		break;
    		// redirect status returned
  	    case 301:
  	    case 302:
      		if(redirection_level > 10) {
      		    sys.puts("too many redirects");
      		}
      		else {
      		    sys.puts("redirect to "+response.headers.location);
      		    get_rss(response.headers.location);
      		}
      		break;
      default:
          console.log('NON-NORMAL STATUS RETURNED: ' + response.statusCode);
          console.log(response);
  

    		/*
    		response.setEncoding('utf8');
    		response.addListener('data', function (chunk) {
    		    //sys.puts('BODY: ' + chunk);
    		});
    */
    		break;
      }	  
  	});
  	request.end();	
  }
};