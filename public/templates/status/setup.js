(function(root) {
var userStatus = {
	ViewModel: {
		newMode: ko.observable(false),
		name: ko.observable(),
		currentStatus: ko.observable(),
		team: ko.observable(),
		nextStatuses: ko.observableArray([]),
		previousStatuses: ko.observableArray([]),
		newStatus : {
			nowOrLater : ko.observable('now'),
			description: ko.observable(''),
		},

		makeStatus: function(fromJson) {
			var d = new (function (j) {
						var self = this;
						self.id = j._id;
						self.name = j.name;
						self.created_on = j.created_on;
						self.started_on = j.started_on;
						self.done_on = j.done_on;
						self.description = j.description;
						self.since = ko.computed(function() {
							var dtime = this.done_on ? Date.parse(this.done_on): Date.now();
							var utime = dtime - Date.parse(this.started_on);
							var minutes = 60 * 1000;
							var tStruct = {
								minutes: parseInt(utime / minutes),
								hours: parseInt(utime / (60 * minutes)),
								days: parseInt(utime / (24 * 60 * minutes))
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
							} else return "under an hour";
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

		makeCurrent: function(nextStatus) {
			var status = ko.toJS(nextStatus);
			_(['since', 'shortDate', 'prepUrl']).each(function(prop) {
				delete status[prop];
			});
			status.started_on = Date.now();
			userStatus.update(status, function(data) {
				var vm = userStatus.ViewModel;
				vm.loadFrom(data);
				vm.newMode(false);
				vm.nextStatuses.remove(nextStatus);
			});
		},
		
		edit: function() {
			userStatus.ViewModel.newMode(true);
		},

		create: function() {
			var vm = userStatus.ViewModel;
			var name = vm.name();
			vm.newMode(true);
		},

		save: function(newStatus) {
			// this is a KO object
			var post = {}, newObject = false;
			post.created_on = Date.now();
			if (newStatus.nowOrLater() === 'now') 
				post.started_on = post.created_on;
			post.description = newStatus.description();
			post.name = userStatus.ViewModel.name();
			
			userStatus.update(post, function(data) {
				var vm = userStatus.ViewModel;
				vm.loadFrom(data);
				newStatus.description('');
				vm.newMode(false);
			});
		},

		cancelEdit: function() {
			var vm = userStatus.ViewModel;
			vm.newMode(false);
		},


		loadFrom: function (fromJson) {
			console.log('loadFrom:', fromJson);
			var self = this;
			var data = _.isArray(fromJson.list) ? fromJson.list: [fromJson.list];
			this.name(fromJson.name);
			data.forEach(function (status) {
				//console.log('loadFrom.data.status:', status);
				var x = self.makeStatus(status);

				switch (x.type) {
					case "current": 
						self.currentStatus(x); 
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

	load: function (fromJson) {
		this.ViewModel.loadFrom(fromJson);
	}, 

	loadDone: function (fromAllJson) {
		var vm = this.ViewModel;
		if (!vm.currentStatus()) vm.newMode(true);
		bind(vm);
	},

	update: function(status, callback) {
		//return;
		var uri = getURI('text/vnd.borax-data-root', { 
			entity: userStatus.entity, 
			data_uri: status.name + (status.id ? '/' + status.id : '') });
		$.ajax({
			url: uri,
			type: 'POST', 
			contentType:'application/json',
			data: JSON.stringify(status),
			success: function(data) {
				callback(data);
			},
			error: function(error) {
				console.log('error: ', error);
			}
		});
	},


	loadData: function(parts) {
		var self = this;
		var statuses = {
			current : {},
			next: { sort: 'asc' },
			done: { sort: 'desc', limit: 10 }
		};
		var uris = _(statuses).map(function(statusConfig, status) {
			return getURI('text/vnd.borax-data-root', { 
				entity:parts.entity
				,data_uri: parts.id + '/' + status + '?' + 
					_(statusConfig).map(function(v, k) {
						return k + '=' + v;
					}).join('&')
			});
		});
		loadJson(
				uris,
				{ 
					each: function(data) { self.load(data); },
					final: function(data) { self.loadDone(data); }
				}
		);
	},

	setup: function(parts) {
		var self = this;
		self.entity = parts.entity;
		console.log('Teams setup with parts:', parts);
		loadCss(getURI('text/vnd.borax-template-root', { template_uri: parts.entity + '/template.css'}));
		loadKoTemplate(getURI('text/vnd.borax-template-root', { 
			template_uri: parts.entity + '/template.html'}),
				function() { self.loadData(parts) });
	}
}

attachToWindow('status', userStatus);
})(window);
