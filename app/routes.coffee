
module.exports = (match) ->
	match "stations",     "stations#index"
	match "stations/:id", "stations#show"

	match "shots",        "shots#index"
	match "shots/:id",    "shots#show"
	