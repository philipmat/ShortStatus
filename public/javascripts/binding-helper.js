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
function du(parts) { return getURI('text/vnd.knockout-data', parts); }
function tu(parts) { return getURI('text/vnd.knockout-template', parts); }
function vmu(parts) { return getURI('text/vnd.knockout-viewmodel', parts); }


function getParts(uri) {
	var parts = getQS(uri).split('/');
	parts = _(parts).filter(function (it) { return it !== ''; });
	var ns = _.first(parts),
		id = _.first(_.rest(parts));
	return { entity : ns, id : id };
}

function includeHelper(parts) {
	$('head').append( $('<script/>', {
		src : vmu(parts),
	type : 'text/javascript'}));
}

function getKOTemplates(parts, callback) {
	if (parts.entity !== undefined) {
		var url = tu(parts);
		$.get(url, function(data) {
			$('#content').append(data);
			callback();
		});
	}
}

function getData(parts, callback) {
	if (parts.entity !== undefined) {
		var ns = parts.entity;
		var all_uri = du(parts);
		// console.log('loading all: %s', all_uri);
		$.getJSON(all_uri, function(allData) {
			window[ns].loadMaster(allData);
			if (parts.id !== undefined) {
				var id_uri = du(parts);
				// console.log('loading single element from: %s', id_uri);
				$.getJSON(id_uri, function(idData) {
					window[ns].loadDetail(idData);
					ko.applyBindings(window[ns].ViewModel);
				});
			} else {
				ko.applyBindings(window[ns].ViewModel);
			}

		});
	}
}

function setup(uri) {
	_.templateSettings = { 
		interpolate: /\{(.+?)\}/g
	}
	var parts = getParts(uri);
	//console.log(parts);
	includeHelper(parts);
	// if using individual chunks:
	//getTemplates(ns, function() {
	// if using KO templates
	getKOTemplates(parts, function() {
		getData(parts);
	});
}

