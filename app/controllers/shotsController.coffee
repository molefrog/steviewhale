SiteView = require "views/site/siteView"

Shot = require "models/shot"

# ShotView = require "views/shot/shotView"
ShotCollection = require "collections/shotCollection"
ShotGridView   = require "views/shot/grid/shotGridView"
ShotView       = require "views/shot/show/shotView"

BaseController = require "controllers/base/baseController"

module.exports = class ShotsController extends BaseController
  beforeAction : ->
    super

  index : ->
    @view = new ShotGridView
      region : "main"

  show : (params) ->
    @model = new Shot
      "_id" : params.id

    @view = new ShotView
      model : @model
      region : "main"

    @model.fetch().then =>
      do @view.render
