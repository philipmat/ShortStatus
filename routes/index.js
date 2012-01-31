
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'Express' })
};


exports.configure = function(app) {
	apt.get('/teams/:name?', function(req, res) {
	});

	apt.get('/status/:name?', function(req, res) {
	});
}
