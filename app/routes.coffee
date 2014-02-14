
module.exports = (match) ->
	match "stations",     "stations#index"
	match "stations/:id", "stations#show"