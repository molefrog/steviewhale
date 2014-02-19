View    = require "views/base/base"
Station = require "models/station"

module.exports = class StationEditView extends View
	model : Station

	template : require "./stationEditTemplate"

	initialize : ->
		@delegate 'click', '.save-button', @save 

	save : ->
		@model.set 
			title : @$(".title-input").val()

		@model.save()

	getTemplateData : ->
		station : @model.attributes
