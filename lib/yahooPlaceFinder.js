var qs = require('querystring')
  ,http = require('http');
  
exports.decode = function(str, callback) {
	var args = {
		flags: 'J',
		q: str,
		appid: '3O48eE4s'
	}

	var path = '/geocode?' + qs.stringify(args);
	
  var options = {
    host: 'where.yahooapis.com',
    port: 80,
    path: path
  };

	http.get(options, function (res) {
		var data = "";
		res.on('data', function (chunk) {
			data += chunk;
		});
		res.on('end', function () {
			if (res.statusCode == 200) callback(null, JSON.parse(data));
			else callback(new Error("Response status code: " + res.statusCode), data);
		});
	}).on('error', function (err) { callback(err); });
}