AuthController = require "./authController"
Station = require "models/station"
StationEditView = require "views/station/edit/stationEditView"
SiteView = require "views/site/siteView"

module.exports = class stationAuthController extends AuthController
	beforeAction : ->
		super
		# Site view declares “main” region.
		@reuse 'site', SiteView

	edit : (params) ->
		@model = new Station
			name : params.name

		@view = new StationEditView
			model : @model
			region : "main"
			autoRender : true

		@model.fetch().then =>
			do @view.render
