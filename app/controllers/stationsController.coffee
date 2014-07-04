SiteView = require "views/site/siteView"
Station = require "/models/station"


StationCollection = require "/collections/stationCollection"
StationListView   = require "/views/station/list/stationListView"

StationEditView = require "/views/station/edit/stationEditView"
StationView     = require "/views/station/show/stationView"

BaseController = require "controllers/base/baseController"

module.exports = class StationsController extends BaseController
  beforeAction: ->
    super

  index: (params) ->
    @collection = new StationCollection
    @view = new StationListView
      collection : @collection
      region : "main"

    @collection.fetch().then =>
      do @view.render

  show : (params) ->
    @model = new Station
      name : params.name

    @view = new StationView
      model : @model
      region : "main"

    @model.fetch().then =>
      do @view.render





