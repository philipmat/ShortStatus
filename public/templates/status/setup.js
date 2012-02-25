(function(root) {
var userStatus = {
	ViewModel : {
		newMode : ko.observable(false),
		name : ko.observable(),
		currentStatus : ko.observable(),
		currentStatusBak : ko.observable(),
		team : ko.observable(),
		nextStatuses : ko.observableArray([]),
		previousStatuses : ko.observableArray([]),

		makeStatus : function(fromJson) {
			var d = new (function (j) {
						var self = this;
						self.id = j._id;
						self.name = j.name;
						self.created_on = j.created_on;
						self.started_on = j.started_on;
						self.done_on = j.done_on;
						self.description = j.description;
						self.since = ko.computed(function() {
							var dtime = this.done_on ? Date.parse(this.done_on) : Date.now();
							var utime = dtime - Date.parse(this.started_on);
							var minutes = 60 * 1000;
							var tStruct = {
								minutes : parseInt(utime / minutes),
								hours : parseInt(utime / (60 * minutes)),
								days : parseInt(utime / (24 * 60 * minutes))
							};	
							var ssince = "about ";
							if ( tStruct.days > 3) {
								ssince += tStruct.days + " days";
							} else if ( tStruct.days > 0) {
								ssince += tStruct.days + " days and " + (tStruct.hours % 24) + " hours";
							} else if (tStruct.hours > 2) {
								ssince += tStruct.hours + " hours";
							} else if (tStruct.hours > 0 ) {
								ssince += tStruct.hours + " hours and " + (tStruct.minutes % 60) + " minutes";
							} else return "Under an hour";
							return ssince;
						}, self);
						self.shortDate = ko.computed(function() {
							return (new Date(Date.parse(this.started_on))).toDateString();
						}, self);
						self.prepUrl = '/status/' + self.name;
						self.type = self.done_on 
							? 'done' 
							: self.started_on 
								? 'current'
								: 'next';
						return self;
					})(fromJson);
			return d;
		}, 

		makeCurrent : function(status) {
			console.log(ko.toJSON(status));
		},
		
		edit : function() {
			userStatus.ViewModel.newMode(true);
		},

		create : function() {
			var vm = userStatus.ViewModel;
			var name = vm.name();
			vm.currentStatus(vm.makeStatus({name:name}));
			vm.newMode(true);
		},

		save : function() {
			console.log(this);
			console.log(ko.toJSON(this));
		},

		cancelEdit : function() {
			var vm = userStatus.ViewModel;
			vm.currentStatus(vm.currentStatusBak());
			vm.newMode(false);
		},


		loadFrom : function (fromJson) {
			var self = this;
			var data = _.isArray(fromJson.list) ? fromJson.list : [fromJson.list];
			this.name(fromJson.name);
			data.forEach(function (status) {
				var x = self.makeStatus(status);

				switch (x.type) {
					case "current": 
						self.currentStatus(x); 
						self.currentStatusBak(x); 
						break;
					case "next": self.nextStatuses.push(x); break;
					case "done": self.previousStatuses.push(x); break;
					default: 
						 console.error("Don't know how to handle type: %s on", x.type, fromJson);
					 	 break;

				}
			});
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
		var uris = _(['current', 'next', 'done']).map(function(x) {
			return getURI('text/vnd.borax-data-root', { entity:parts.entity, data_uri : parts.id + '/' + x });
		});
		loadJson(
				uris,
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
})(window);
