
/*
 * GET home page.
 */
var path = require('path');
var db = require('nano')('http://localhost:5984/shortstat');
var _ = require('underscore');
var async = require('async');
var PUB  = path.normalize(__dirname + '/../../../');
var VIEW_NS = 'shortstatus';
var VIEW_TEAM = 'teams_and_members';
var VIEW_STAT = 'status_by_member';

function servePublicFile(file, req, res) {
	var pub = PUB + file;
	console.log('Serving static: %s', pub);
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
		if (req.params.name !== undefined) {
			db.view(VIEW_NS, VIEW_TEAM, {keys:[req.params.name]}, function(x,data) {
				var t = data.rows[0];
				var team = { 
					_id : t.id, 
					team_members : t.value,
					team_name: t.key,
					current : []
				}

				async.forEach(team.team_members, 
					function(t_m, on_done) {
						db.view(VIEW_NS, VIEW_STAT, { key: ['current', t_m] }, function(x, data) {
							data.rows.forEach(function(row) {
								team.current.push(row.value);
							});
							on_done();
						});
					}
					, function(err) {
						if (err) { 
							console.log('async.forEach(team.team_members) errored out:', err);
						};
						console.log(team);
						res.json(team);
					}
				);
			});
		} else {
			db.view(VIEW_NS, VIEW_TEAM, {include_docs:true}, function(x,data) {
				res.json(_(data.rows).map(function(v) {
					return v.doc; }));
			});
		}
	});

	function show_status(name, status, callback) {
		console.log('%s status for: %s.', status, name);
		var stat = db.view(VIEW_NS, VIEW_STAT, {key:[status, name]}, function(x,data) {
			callback(_(data.rows).map(function(r) {
				return r.value;
			}));
		});
	}

	app.get('/data/status/:name/:status', function(req, res, next) {
		var name = req.params.name
			, status = req.params.status;
		show_status(name, status, function(rows) {
			res.json({name:name, status:status, list:rows});
		});
	});

	app.post('/data/status/:name', function(req, res, next) {}); // adds a new status to the next list
	app.put('/data/status/:name', function(req, res, next) {}); // updates a next status


	app.get('/data/status/:name?', function(req, res, next) {
		console.log('Status for %s.', req.params.name || 'all');
	});
}
