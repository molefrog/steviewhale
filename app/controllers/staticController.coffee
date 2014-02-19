SiteView  = require "views/site/siteView"
AboutView = require "views/about/aboutView"

module.exports = class StaticController extends Chaplin.Controller
	beforeAction: ->
		@reuse 'site', SiteView

	about: (params) -> 
		@view = new AboutView
			autoRender : true
			region : "main"
