Station = require "models/station"

module.exports = class StationCollection extends Chaplin.Collection
	_.extend @prototype, Chaplin.SyncMachine
	
	model : Station
	url : "/api/stations"
