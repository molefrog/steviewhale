SiteView  = require "views/siteView"
AboutView = require "views/aboutView"

module.exports = class StaticController extends Chaplin.Controller
	beforeAction: ->
		@reuse 'site', SiteView

	about: (params) -> 
		@view = new AboutView
			autoRender : true
			region : "main"
