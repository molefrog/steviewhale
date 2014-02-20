View = require "views/base/base"
Storage = require "storage"

module.exports = class StationListItemView extends View
	template : require "./stationListItemTemplate"

	getTemplateData : ->
		station : @model.attributes
