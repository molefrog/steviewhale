
module.exports = (match) ->
	match "stations",            "stations#index"

	match "stations/create", 
		controller : "auth/stationAuth"
		action : "create"
		name : "station_create"
	
	match "stations/:name",      "stations#show"

	match "stations/:name/edit", 
		controller : "auth/stationAuth"
		action : "edit"
		name : "station_edit"

	match "stations/:name/rename", 
		controller : "auth/stationAuth"
		action : "rename"
		name : "station_rename"
		


	match "auth/login", 
		controller : "auth/login"
		action : "login"
		name : "auth_login"

	match "auth/logout", 
		controller : "auth/login"
		action : "logout"
		name : "auth_logout"

	match "shots",        "shots#index"
	match "shots/:id",    "shots#show"

	match "",             "static#about"
	