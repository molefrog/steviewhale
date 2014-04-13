SiteView  = require "views/site/siteView"
AboutView = require "views/about/aboutView"

BaseController = require "controllers/base/baseController"

module.exports = class StaticController extends BaseController
  beforeAction: ->
    super

  about: (params) ->
    @view = new AboutView
      autoRender : true
      region : "main"
