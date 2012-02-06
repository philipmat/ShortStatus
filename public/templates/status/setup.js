var userStatus = {
	ViewModel : {
		name : ko.observable(),
		currentStatus : ko.observable(),
		team : ko.observable(),
		nextStatuses : ko.observableArray([]),
		previousStatuses : ko.observableArray([]),

		makeStatus : function(fromJson) {
			var d = new (function (j) {
						var self = this;
						this.id = j._id;
						this.date = j.date;
						this.description = j.description,
						this.type = j.type,
						this.since = ko.computed(function() {
							var utime = Date.now() - Date.parse(this.date);
							var minutes = 60 * 1000;
							var tStruct = {
								minutes : parseInt(utime / minutes),
								hours : parseInt(utime / (60 * minutes)),
								days : parseInt(utime / (24 * 60 * minutes))
							};	
							var ssince = "about ";
							if ( tStruct.days > 3) {
								ssince += tStruct.days + " days.";
							} else if ( tStruct.days > 0) {
								ssince += tStruct.days + " days and " + (tStruct.hours % 24) + " hours.";
							} else if (tStruct.hours > 2) {
								ssince += tStruct.hours + " hours.";
							} else if (tStruct.hours > 0 ) {
								ssince += tStruct.hours + " hours and " + (tStruct.minutes % 60) + " minutes.";
							} else return "Under an hour.";
							return ssince;
						}, this);
						this.prepUrl = '/status/' + this.name;
						return this;
					})(fromJson);
			return d;
		}, 

		loadFrom : function (fromJson) {
			var self = this;
			this.name(fromJson.name);
			var x = this.makeStatus(fromJson);
			switch (x.type) {
				case "current": this.currentStatus(x); break;
				case "next": this.nextStatuses.push(x); break;
				case "previous": this.previousStatuses.push(x);
				default: 
					console.log("Don't know how to handle type: %s on", x.type, fromJson);
					break;

			}
		},
	},

	load : function (fromJson) {
		this.ViewModel.loadFrom(fromJson);
	}, 

	loadDone : function (fromAllJson) {
		bind(this.ViewModel);
	},

	loadData : function(parts) {
		var self = this;
		var templateVars = {entity:parts.entity, data_uri : parts.id + '/current' };
		loadJson(
				[getURI('text/vnd.borax-data-root', templateVars)],
				{ 
					each : function(data) { self.load(data); },
					final : function(data) { self.loadDone(data); }
				}
		);
	},

	setup : function(parts) {
		var self = this;
		console.log('Teams setup with parts:', parts);
		loadCss(getURI('text/vnd.borax-template-root', { template_uri : parts.entity + '/template.css'}));
		loadKoTemplate(getURI('text/vnd.borax-template-root', { 
			template_uri : parts.entity + '/template.html'}),
				function() { self.loadData(parts) });
	}
}

attachToWindow('status', userStatus);
