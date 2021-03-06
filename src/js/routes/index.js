
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
var DATE_MIN 

function servePublicFile(file, req, res) {
	var pub = PUB + file;
	//console.log('Serving static: %s', pub);
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
		//console.log(req.params);
		var url = req.params[0];
		console.log('url:%s', url);
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
						get_status(t_m, 'current', function(docs) {
							_(docs).each(function(doc) {
								team.current.push(doc);
							});
							on_done();
						});
					}
					, function(err) {
						if (err) { 
							console.log('async.forEach(team.team_members) errored out:', err);
						};
						res.json(team);
					}
				);
			});
		} else {
			db.view(VIEW_NS, VIEW_TEAM, {include_docs: true}, function(x,data) {
				res.json(_(data.rows).map(function(v) {
					return v.doc; }));
			});
		}
	});

	function get_status(name, status, params, callback) {
		var options = {include_docs: true}, onDone = null;
		if (_.isFunction(params)) {
			onDone = params;
		} else {
			_.extend(options, params);
			onDone = callback;
		}

		if (!options.startkey) {
			// don't overwrite the start key if passed in.
			var startkey = [status, name, null], endkey = [status, name, {}];
			options.startkey = options.descending === true ? endkey : startkey;
			options.endkey = options.descending === true ? startkey : endkey;
		}

		//console.log('%s status for: %s. params: ', status, name, options);
		var stat = db.view(VIEW_NS, VIEW_STAT, options, function(x,data) {
			//console.log('get_status:', data.rows);
			onDone(_(data.rows).map(function(r) {
				return r.doc;
			}));
		});
	}

	function update_status(status, callback) {
		console.log('update_status:', status);
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
		console.log('query:', req.query);
		console.log('params:', req.params);

		var options = {};
		if (req.query.limit !== undefined) options.limit = req.query.limit;
		if (req.query.sort !== undefined && req.query.sort == 'desc') options.descending = true;

		get_status(name, status, options, function(rows) {
			res.json({name: name, status: status, list: rows});
		});
	});

	app.post('/data/status/:name/:id?', function(req, res, next) {
		var name = req.params.name, id = req.params.id;
		var started_on = req.body.started_on;
		var res_out = function(doc) {
			var docs = _.isArray(doc) ? doc : [doc];
			res.json({name: name, list: docs}, 201);	
		}

		if (id !== undefined) {
			// updating an existing status
			console.log('updating existing document: %s', id);
			if (started_on !== undefined) {
				// another status was made current
				// or an existing current status was updated
				console.log('update or activate');
				make_current(id, name, res_out);
			} else {
				// a new status was updated
				console.log('update next document');
			}
		} else {
			// a new status was created
			var status = {
				created_on: new Date(Date.now()).toISOString(),
				description: req.body.description,
				name: name
			};
			add_new(status, function(doc) {
				if (started_on !== undefined) {
					make_current(doc._id, name, res_out);
				} else {
					res_out(doc);
				}
			});
		}

		console.log(req.body);
	});

	function mark_done(status_rows, when) {
		if (!_.isEmpty(status_rows)) {
			status_rows[0].done_on = when;
			return status_rows[0];
		}
	}

	function make_current(id, name, callback) {
		var now = new Date(Date.now()).toISOString();
		var final_docs = [];
		get_status(name, 'current', function(status_rows) {
			var previous = mark_done(status_rows, now);
			if (previous) final_docs.push(previous);

			console.log('previous current:', previous);
			db.get(id, function(e, nextDoc) {
				nextDoc.started_on = now;
				final_docs.push(nextDoc);
				console.log('updating %d docs.', final_docs.length);

				async.forEach(final_docs, function(updateThisDoc, next) {
					console.log('updating:', updateThisDoc);
					update_status(updateThisDoc, function(err, updatedId) {
						next();
					});
				}, function (err) {
					callback(final_docs);
				});
			});
		});
	}

	function add_new(status, callback) {
		update_status(status, function(err, docId) {
			console.log('add_new.err:', err);
			console.log('add_new.docId:', docId);
			db.get(docId, function(e, doc) {
				console.log('add_new.e:', e);
				console.log('add_new.doc:', doc);
				callback(doc);
			});
		});
	}

	app.put('/data/status/:name', function(req, res, next) {});


	/*
	 * :name - is the name of the person for whom to retrieve statuses
	 * :from - is an ISO formatted date
	 * :to - is an ISO formatted date (if missing "now" is assumed)
	 */
	app.get('/data/status/:name/daterange/:from/:to?', function(req, res, next) {
		var name = req.params.name
			,date_from = req.params.from
			,date_to = req.params.to || (new Date()).toISOString();

		var options_done = {
			startkey: ['done', name, date_from],
			endkey: ['done', name, date_to]
		}, options_next = {
			startkey: ['next', name, date_from],
			endkey: ['next', name, date_to]
		};
		
		var results = [];
		async.forEach([options_done, options_next], function(opt, on_done) {
				get_status(name, null, opt, function(rows) {
					console.log(rows);
					results.push(rows);
					on_done();
				})
			}
			, function () {
				res.json(results);
			}
		);
	});
}
