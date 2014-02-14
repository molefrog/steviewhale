View = require "views/base/base"

module.exports = class StationView extends View
	template : require "views/templates/station"

	getTemplateData : ->
		station : @model
