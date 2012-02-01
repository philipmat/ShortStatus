window['teams'] = {
	ViewModel : {
		id : null,
		teamName : ko.observable(),
		teamMembers : ko.observableArray([]),
		currentStatuses : ko.observableArray([]),

		makeFrom : function (fromJson) {
			var self = this;
			self.id = fromJson.id;
			self.teamName(fromJson.team_name);
			fromJson.team_members.forEach(function(m) {
				self.teamMembers.push(m);});
			fromJson.current.forEach(function(s) {
				self.currentStatuses.push({
					id : s._id,
					date : s.date,
					name : s.name,
					description : s.description,
					since : ko.computed(function() {
						console.log(this);
						return s.date;
					})
				});
			});
		}
	},

	loadDetail : function (fromJson) {
		this.ViewModel.makeFrom(fromJson);
	},

	loadMaster : function (fromJson) {}
}
