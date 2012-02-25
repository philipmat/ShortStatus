function attachToWindow(namespace, objectForNamespace) {
	if (window.shortstatus === undefined) {
		window.shortstatus = {};
		window.shortstatus[namespace] = objectForNamespace;
	} else if (window.shortstatus[namespace] === undefined) {
		window.shortstatus[namespace] = objectForNamespace;
	}
}

function loadScript(url, onLoad) {
    var s = document.createElement('script'),
        onEvent = ('onreadystatechange' in s) ? 'onreadystatechange' : 'onload';

    s[onEvent] = function () {
        if (("loaded,complete").indexOf(this.readyState || "loaded") > -1) {
            s[onEvent] = null;

            // Call your code here
            onLoad(url);
        }
    };

    s.type = 'text/javascript';
    s.src = url;

    document.getElementsByTagName('head')[0].appendChild(s);
}

function getQS(uri) {
	return uri.substr(1);
}

function getURI(type, parts) { 
	var link =$('link[rel="uri-template"][type="' + type + '"]'); 
	var hrefTemplate = link.attr('href');
	if (hrefTemplate === undefined) {
		console.error("Cannot find <link rel='uri-template' type='%s' href=.../> in page.", type); 
		return '';
	}
	var compiled = _.template(hrefTemplate);
	var url = compiled(parts);
	//console.debug('getURI -> url=%s', url);
	return url;
}

function getParts(uri) {
	var parts = getQS(uri).split('/');
	parts = _(parts).filter(function (it) { return it !== ''; });
	var ns = _.first(parts),
		id = _.first(_.rest(parts));
	return { uri : uri,  entity : ns, id : id, all : parts};
}

function loadCss(uri, callback) {
	//console.log('Loading css for %s.', uri);
	$('head').append($('<link/>', {
		type : 'text/css',
		rel  : 'stylesheet',
		href : uri
		})
	);
	if (callback) callback();
}

function loadKoTemplate(uri, callback) {
	$.get(uri, function(data) {
		var parent = $('<div/>');
		parent.append(data);
		parent.children().each(function() {
			var selector = $(this).attr('append-to');
			//console.log('selector: %s', selector);
			if (selector !== undefined) {
				$(selector).append(this);
			} else {
				$('body').append(this);
			}
		});
		if (callback) callback(data);
	});
}

/**
 * Loads JSON from an URI and passes it to a callback.
 * Can take in an array of uris, in which case:
 * - if callback is an array of length uri.length + 1, calls 
 *   each corresponding callback for each uri, then the extra one
 *   at the end of all uris, passing in the collected JSONs
 *   as an array
 * - if callback is an array of same lenght or less,
 *   it calls each correspoinding callback, supplementing missing 
 *   ones with a noop.
 * - if callback is a function, it calls that function for each of the uris
 * - if callback is an object with a property called 'each', it calls that each 
 *   function for each uri; if the callback has a property called 'final',
 *   it called that function at the end of the run, passing in the 
 *   collected JSONs
 */
function loadJson(uri, callback) {
	var uris = [], callbacks = [], finalC = noop = function() {};
	if (_.isArray(uri)) {
		uris = uri;
		if (_.isArray(callback)) {
			if (callback.length === uri.length + 1) {
				callbacks = _.initial(callback);
				finalC = _.last(callback);
			} else {
				var cs = [].slice.apply(callback); 
				_.times(uris.length, function() {
					var cx = cs.shift();
					if (cx === undefined) cx = noop;
					callbacks.push(cx);
				});
			}
		} else if (_.isFunction(callback)) {
			// TODO: maybe this should be finalC with noop for callbacks
			_.times(uris.length, function() {
				callbacks.push(callback);
			});
		} else if (callback.each || callback.final) {
			var each = callback.each || noop;
			finalC = callback.final || noop;
			_.times(uris.length, function() {
				callbacks.push(each);
			});
		}
	} else { 
		uris.push(uri);
		callbacks.push(callback);
	}
	//console.log('URIs: %o, callbacks %s', uris, callbacks.length);
	var semaphore = uris.length, allData = [];
	for (var i = 0; i < uris.length; i++) {
		var ux = uris[i], cx = callbacks[i];

	};
	for (var i = 0; i < uris.length; i += 1) {
		var ux = uris[i], cx = callbacks[i];

		$.getJSON(ux, function(data) {
			//console.log('for %s got: ', ux, data);
			if (cx) cx(data);
			semaphore--; allData.push(data);
			if (semaphore === 0) finalC(allData);
		});
	}
}

function includeHelper(parts) {
	var uri = getURI('text/vnd.borax-helper', parts),
		ns = parts.ns;
	loadScript(uri, (function(args) {
				return function(scriptUri) {
					//console.log('Loaded %s.', scriptUri, args);
					window.shortstatus[args.entity].setup(args);
				};
			})(parts));
}

function bind(viewModel) {
	console.debug('Binding view model: ', viewModel);
	window.myViewModel = viewModel;
	ko.applyBindings(viewModel);
}

function setup(uri) {
	_.templateSettings = { 
		interpolate: /\{(.+?)\}/g
	};
	ko.observableArray.fn.last = function () {
		//console.log("last args:", arguments);
		var matchValue = arguments[0];
		return this().indexOf(matchValue) === this().length - 1;
	};
	var parts = getParts(uri);
	//console.log(parts);
	includeHelper(parts);
}

