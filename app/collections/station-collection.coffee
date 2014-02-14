Station = require "models/station"

module.exports = class StationCollection extends Chaplin.Collection
	model : Station
	url : "/api/stations"
