
module.exports = (match) ->
	match "stations",            "stations#index"
	match "stations/:name",      "stations#show"
	match "stations/:name/edit", "stations#edit"

	match "shots",        "shots#index"
	match "shots/:id",    "shots#show"

	match "",             "static#about"
	