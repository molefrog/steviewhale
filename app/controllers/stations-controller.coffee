SiteView = require "views/site-view"
Station = require "/models/station"
StationCollection = require "/collections/station-collection"
StationCollectionView = require "/views/station-collection-view"


module.exports = class StationsController extends Chaplin.Controller
  beforeAction: ->
    # Site view declares “main” region.
    @reuse 'site', SiteView

  # Index action. Will just display a list of users.
  index: (params) ->
    @collection = new StationCollection
    @view = new StationCollectionView
      collection : @collection
      region : "main"

    @collection.fetch().then =>
      do @view.render
