
module.exports = class Station extends Chaplin.Model
	url: ->
		"api/station/#{@get 'name'}"