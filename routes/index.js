
/*
 * GET home page.
 */
var path = require('path');
var _ = require('underscore');
var PUB  = path.normalize(__dirname + '/../');

function servePublicFile(file, req, res) {
	var pub = PUB + file;
	console.log('Serving public: %s', pub);
  	res.sendfile(pub);
}

/* bad function, for the time being - might get back to it
function servePublic(file, req, res) {
	var parts = _(file.split('/')).without("");
	if (parts[1] == "templates") {
		var entity = parts[2] || 'main.html';
		var template = 'templates/' + entity;
		path.exists(PUB + template, function(exists) {
			if (exists)
				servePublicFile('public/' + template, req, res);
			else
				servePublicFile('public/templates/main.html');
		});
	} else {
		servePublicFile(file);
	}
}
*/


exports.configure = function(app) {
	app.get(/^\/(.+)\/?/, function(req,res,next) {
		console.log(req.params);
		var url = req.params[0];
		if (url.indexOf('public') === 0) {
			//servePublicFile(url, req, res);
			servePublicFile(url, req, res);
		} else  if (url.indexOf('data') === 0) next();
		else if (url === 'favicon.ico')
			res.send(404);
		else { 
			servePublicFile('public/index.html', req,res);
		}
	});

	app.get('/data/teams/:name?', function(req, res) {
		console.log('Status for team %s.', req.params.name || 'all');
	});

	app.get('/data/status/:name?', function(req, res) {
		console.log('Status for %s.', req.params.name || 'all');
	});
}
