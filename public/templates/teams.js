window['teams'] = {
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
			var m = {
						teamName : fromJson.team_name,
						teamMembers : fromJson.team_members,
						prepUrl : ko.computed(function() {
							return '/teams/' + fromJson.team_name;
						})
					};
				
			return m;
		}, 
		
		makeStatus : function(fromJson) {
			var d = {
						id : fromJson._id,
						date : fromJson.date,
						name : fromJson.name,
						description : fromJson.description,
						since : ko.computed(function() {
							return fromJson.date;
						}),
						prepUrl : ko.computed(function () {
							return '/status/' + fromJson.name;
						})
					};
			return d;
		}, 

		makeTeamMember : function(fromJson) {
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
		loadKoTemplate(getURI('text/vnd.borax-template-root', { 
			template_uri : parts.entity + '.html'}),
				function() { self.loadData(parts) });
	}
}
