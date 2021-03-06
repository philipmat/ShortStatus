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

		sortByDate : function(date_property) {
			return function(left, right) {
				var dateL = left[date_property],
					dateR = right[date_property];
				return dateL == dateR ? 0 : (dateL < dateR ? -1 : 1);
			}
		},
		getStatusType: function(data) {
			return data.done_on 
					? 'done' 
					: data.started_on 
						? 'current'
						: 'next';

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

		//sparkBars: ko.observable( '▁▁▃▂▇ ▁▃▂▇▁▁▃▂▇▁▁▃▂▇'),
		sparkBars: ko.observable( spark(_([1,2,3,4,5,6,7,1,2,3,4,5,6,7]).map(function(x) { return Math.random() * 5; }))),
		//sparkBars2: ko.observable('▇▃▂▇▂▇▁▂▇▃▂▇▇▇▃▂▇▇▁▃'),
		sparkBars2: ko.observable( spark(_([1,2,3,4,5,6,7,1,2,3,4,5,6,7]).map(function(x) { return Math.random() * 5; }))),

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
			self.nextStatuses.sort(userStatus.ViewModel.sortByDate('created_on'));
			self.previousStatuses.sort(userStatus.ViewModel.sortByDate('done_on')).reverse();
		},
	},

	load: function (fromJson) {
		this.ViewModel.loadFrom(fromJson);
	}, 

	loadHistory: function(fromJson, originDate) {
		var stats = { done: {}, next: {} };
		var now = new Date();
		now.setDate(now.getDate()+1);now.setHours(0);now.setMinutes(0);now.setSeconds(0);
		var s = '';
		for(var date = originDate; date < now; date.setDate(date.getDate() + 1)) {
			s = date.toISOString().substr(0,10);
			stats.done[s] = 0;
			stats.next[s] = 0;
		}
		var statFunc = this.ViewModel.getStatusType;
		_(_.flatten(fromJson))
			.each(function(status) {
				if(status.done_on) {
					s = new Date(Date.parse(status.done_on)).toISOString().substr(0,10);
					if (stats.done.hasOwnProperty(s))
						stats.done[s] += 1;
				} else if (status.started_on) {
				} else if (status.created_on) {
					s = new Date(Date.parse(status.created_on)).toISOString().substr(0,10);
					if (stats.next.hasOwnProperty(s))
						stats.next[s] += 1;
				}
			});
		console.log(stats, fromJson);
		var dones = _.values(stats.done), nexts = _.values(stats.next);
		this.ViewModel.sparkBars(spark(dones));
		var maxNext = _.max(nexts);
		this.ViewModel.sparkBars2(spark(_(nexts).map(function(x) { return maxNext - x; })));
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

		var now = new Date();
		now.setDate(now.getDate() - 14);
		var historyUri = getURI('text/vnd.borax-data-root', {
			entity: parts.entity
			,data_uri: parts.id + '/daterange/' + now.toISOString()
		});
		loadJson(historyUri, function(data) {
			console.log('historyUri=%s', historyUri, data);
			self.loadHistory(data, now);
		});
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
