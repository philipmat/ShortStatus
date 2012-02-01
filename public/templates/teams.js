window['teams'] = {
	ViewModel : {
		// master
		teams : ko.observableArray([]),
		// detail
		id : null,
		teamName : ko.observable(),
		teamMembers : ko.observableArray([]),
		currentStatuses : ko.observableArray([]),

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

		makeFrom : function (fromJson) {
			var self = this;
			if (fromJson.teams !== undefined) {
				console.debug('Loading teams:', fromJson);
				fromJson.teams.forEach(function(t) {
					self.teams.push(self.makeMaster(t));
				});
			} else {
				console.debug('Loading team.');
				self.id = fromJson._id;
				self.teamName(fromJson.team_name);
				fromJson.team_members.forEach(function(m) {
					self.teamMembers.push(m);});
				fromJson.current.forEach(function(s) {
					self.currentStatuses.push(self.makeStatus(s));
				});
			}
			console.debug(this);
		}
	},

	loadDetail : function (fromJson) {
		this.ViewModel.makeFrom(fromJson);
	},

	loadMaster : function (fromJson) {
		this.ViewModel.makeFrom(fromJson);
	}
}
