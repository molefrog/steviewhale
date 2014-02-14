
module.exports = class Station extends Chaplin.Model
	urlRoot : "/api/stations"
	url: ->
		"/api/stations/#{@get 'name'}"