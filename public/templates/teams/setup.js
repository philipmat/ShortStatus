(function(root) {
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
			var m = new (function(j){
						this.teamName = j.team_name;
						this.teamMembers = ko.observableArray();
						j.team_members.forEach(function (tm) {
							this.teamMembers.push(teams.ViewModel.makeTeamMember(tm));
						}, this);
						this.prepUrl = ko.computed(function() {
							return '/teams/' + this.teamName;
						}, this);
						return this;
					})(fromJson);
				
			return m;
		}, 
		
		makeStatus : function(memberName, fromJson) {
			var d = new (function (m, j) {
						var self = this;
						this.member = m;
						if (j) {
							this.status = {
								id: j._id,
								created_on: j.created_on,
								started_on: j.started_on,
								name: j.name,
								description: j.description
							};
							this.status.since = ko.computed(function() {
								var utime = Date.now() - Date.parse(self.status.started_on);
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
							});
						};
						this.prepUrl = '/status/' + m;
						return this;
					})(memberName, fromJson);
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
			if (_.isArray(fromJson)) {
				console.debug('Loading teams:', fromJson);
				fromJson.forEach(function(t) {
					console.log('Team.j:', t);
					var m = self.makeMaster(t);
					//console.log('Team:', m);
					self.teams.push(m);
				});
			} else {
				console.debug('Loading team.', fromJson);
				self.team.id = fromJson._id;
				self.team.teamName(fromJson.team_name);
				fromJson.team_members.forEach(function(m) {
					self.team.teamMembers.push(m);});
				_(fromJson.team_members).each(function(m) {
					var status = _(fromJson.current).find(function(c) {
						return c.name === m;
					});

					self.team.currentStatuses.push(self.makeStatus(m, status));
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
})(window);
