var teams = {
	ViewModel : {
		// master
		teams : ko.observableArray([]),
		// detail
		team : {
			id : null,
			teamName : ko.observable(),
			teamMembers : ko.observableArray([]),
			currentStatuses : ko.observableArray([]),
		},

		makeMaster : function(fromJson) {
			var self = this;
			var m = (function(j){
						this.teamName = j.team_name;
						this.teamMembers = ko.observableArray();
						j.team_members.forEach(function (tm) {
							this.teamMembers.push(self.makeTeamMember(tm));
						});
						this.prepUrl = ko.computed(function() {
							return '/teams/' + this.teamName;
						})
						return this;
					})(fromJson);
				
			return m;
		}, 
		
		makeStatus : function(fromJson) {
			var d = new (function (j) {
						var self = this;
						this.id = j._id;
						this.date = j.date;
						this.name = j.name;
						this.description = j.description,
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

		makeTeamMember : function(fromJson) {
			var m = {};
			if (_.isString(fromJson)) {
				m = new (function (j) {
					this.name = j;
					this.prepUrl = '/status/' + j;
					return this;
				})(fromJson);
			}
			return m;
		},

		loadFrom : function (fromJson) {
			var self = this;
			if (fromJson.teams !== undefined) {
				console.debug('Loading teams:', fromJson);
				fromJson.teams.forEach(function(t) {
					var m = self.makeMaster(t);
					//console.log('Team:', m);
					self.teams.push(m);
				});
			} else {
				console.debug('Loading team.');
				self.team.id = fromJson._id;
				self.team.teamName(fromJson.team_name);
				fromJson.team_members.forEach(function(m) {
					self.team.teamMembers.push(m);});
				fromJson.current.forEach(function(s) {
					self.team.currentStatuses.push(self.makeStatus(s));
				});
			}
		}
	},

	load : function (fromJson) {
		this.ViewModel.loadFrom(fromJson);
	}, 
	
	loadData : function(parts) {
		var self = this;
		var templateVars = {entity:parts.entity, data_uri : ''};
		if (parts.id !== undefined) {
			templateVars['data_uri'] = parts.id;
		}
		loadJson(
				getURI('text/vnd.borax-data-root', templateVars),
				function(data) {
					self.load(data);
					bind(self.ViewModel);
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

attachToWindow('teams', teams);
