
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
					_id: t.id, 
					team_members: t.value,
					team_name: t.key,
					current: []
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

	function get_status(name, status, callback) {
		console.log('%s status for: %s.', status, name);
		var stat = db.view(VIEW_NS, VIEW_STAT, {key:[status, name]}, function(x,data) {
			callback(_(data.rows).map(function(r) {
				return r.value;
			}));
		});
	}

	function update_status(status, callback) {
		db.insert(status, function(e,b,h) {
			console.log('update.ERROR:', e);
			console.log('update.BODY:', b);
			if (e) { 
				callback(e, null);
			} else {
				callback(null, b.id);
			}
		});
	}

	app.get('/data/status/:name/:status', function(req, res, next) {
		var name = req.params.name
			, status = req.params.status;
		get_status(name, status, function(rows) {
			res.json({name:name, status:status, list:rows});
		});
	});

	app.post('/data/status/:name/:id?', function(req, res, next) {
		var name = req.params.name, id = req.params.id;
		var started_on = req.body.started_on;
		if (id !== undefined) {
			// updating an existing status
			console.log('updating existing document: %s', id);
			if (started_on !== undefined) {
				// another status was made current
				// or an existing current status was updated
				console.log('update or activate');
			} else {
				// a new status was added
				console.log('update next document');
			}
		} else {
			// a new status was created
			if (started_on !== undefined) {
				console.log('new current');
				// a new current status was created:
				// 1. obsolete the old one
				// 2. make the new one active
				get_status(name, 'current', function(status_rows) {
					var previous = null;
					var now = new Date(Date.now()).toISOString();
					if(!_.isEmpty(status_rows)) {
						// obsolete status
						previous = status_rows[0];
						previous.done_on = now;
					}
					var current = {
						created_on: now,
						started_on: now,
						name: name,
						description: req.body.description
					}

					var docs = { name: name, list: []};
					if (previous != null)
						update_status(previous, function() {});
					update_status(current, function(err, updatedId) {
						var ids = [previous._id, updatedId];
						console.log('getting docs for ids:', ids);
						async.forEach(ids, function (docId, next) {
							db.get(docId, function (e,doc) {
								console.log('for %s got doc:', docId, doc);
								docs.list.push(doc);
								next();
							});
						}, function (err) {
							res.json(docs);
						});
					});
				});
			} else {
				// a new next status was created
				console.log('new next');
			}
		}

		console.log(req.body);
	});

	app.put('/data/status/:name', function(req, res, next) {});


	app.get('/data/status/:name?', function(req, res, next) {
		console.log('Status for %s.', req.params.name || 'all');
	});
}
