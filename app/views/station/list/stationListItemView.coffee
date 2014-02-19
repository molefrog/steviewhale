View = require "views/base/base"

module.exports = class StationListItemView extends View
	template : require "./stationListItemTemplate"

	getTemplateData : ->
		station : @model.attributes
