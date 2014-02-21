View    = require "views/base/base"
Station = require "models/station"

module.exports = class StationView extends View
	model : Station

	initialize : ->
		@delegate "click", ".delete-confirm-button", @deleteStation
	
	deleteStation : ->
		@$(".delete-modal").modal("hide")
		@model.destroy
			success : =>
				Chaplin.utils.redirectTo "stations#index"

	template : require "./stationView_"

	getTemplateData : ->
		station : @model.attributes
