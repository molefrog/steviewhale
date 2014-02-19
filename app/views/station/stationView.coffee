View    = require "views/base/base"
Station = require "models/station"

module.exports = class StationView extends View
	model : Station

	template : require "./stationViewTemplate"

	getTemplateData : ->
		station : @model.attributes
