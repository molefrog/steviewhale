SiteView = require "views/site/siteView"

Shot = require "models/shot"

# ShotView = require "views/shot/shotView"
ShotCollection = require "collections/shotCollection"
ShotGridView   = require "views/shot/grid/shotGridView"

module.exports = class ShotsController extends Chaplin.Controller
  beforeAction : ->
    # Site view declares “main” region.
    @reuse 'site', SiteView

  index : ->
    @collection = new ShotCollection
    @view = new ShotGridView
      collection : @collection
      region : "main"

    do @collection.fetch
