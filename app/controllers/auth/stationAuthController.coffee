AuthController    = require "./authController"

Station           = require "models/station"
StationEditView   = require "views/station/edit/stationEditView"
StationCreateView = require "views/station/create/stationCreateView" 
StationRenameView = require "views/station/rename/stationRenameView"

SiteView        = require "views/site/siteView"

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

    @model.fetch().then =>
      do @view.render

  create : (params) ->
    @view = new StationCreateView
      region : "main"
      autoRender : true

  rename : (params) ->
    @model = new Station
      name : params.name

    @view = new StationRenameView
      model : @model
      region : "main"

    @model.fetch().then =>
      do @view.render
