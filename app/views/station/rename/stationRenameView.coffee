View = require "views/base/base"

Station           = require "models/station"
StationCollection = require "collections/stationCollection"

module.exports = class StationRenameView extends View
	initialize : ->
		@delegate "click", ".rename-button", @rename
		@delegate "click", ".cancel-button", @cancel

	rename : ->
		nameValue = $(".name-input").val()

		@model.rename nameValue, (err) =>
			do @cancel
			
	cancel : ->
		Chaplin.utils.redirectTo "stations#show", 
			name : @model.get "name"



	template : require "./stationRenameView_"

	getTemplateData : ->
		station : @model.attributes