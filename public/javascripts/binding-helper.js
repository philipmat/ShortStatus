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
	console.debug('getURI -> url=%s', url);
	return url;
}

function getParts(uri) {
	var parts = getQS(uri).split('/');
	parts = _(parts).filter(function (it) { return it !== ''; });
	var ns = _.first(parts),
		id = _.first(_.rest(parts));
	return { uri : uri,  entity : ns, id : id, all : parts};
}

function loadKoTemplate(uri, callback) {
	$.get(uri, function(data) {
		$('#content').append(data);
		if (callback) callback(data);
	});
}

function loadJson(uri, callback) {
	$.getJSON(uri, function(data) {
		if (callback) callback(data);
	});
}

function includeHelper(parts) {
	var uri = getURI('text/vnd.borax-helper', parts),
		ns = parts.ns;
	loadScript(uri, (function(args) {
				return function(scriptUri) {
					console.log('Loaded %s.', scriptUri, args);
					window[args.entity].setup(args);
				};
			})(parts)
			);
}

function bind(viewModel) {
	console.debug('Binding view model: ', viewModel);
	ko.applyBindings(viewModel);
}

function setup(uri) {
	_.templateSettings = { 
		interpolate: /\{(.+?)\}/g
	}
	var parts = getParts(uri);
	//console.log(parts);
	includeHelper(parts);
}

