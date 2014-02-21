SiteView = require "views/site/siteView"
Station = require "/models/station"


StationCollection = require "/collections/stationCollection"
StationListView   = require "/views/station/list/stationListView"

StationEditView = require "/views/station/edit/stationEditView"
StationView     = require "/views/station/show/stationView"


module.exports = class StationsController extends Chaplin.Controller
  beforeAction: ->
    # Site view declares “main” region.
    @reuse 'site', SiteView

  # Index action. Will just display a list of users.
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





