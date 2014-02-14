SiteView  = require "views/site-view"
AboutView = require "views/about-view"

module.exports = class StaticController extends Chaplin.Controller
	beforeAction: ->
		@reuse 'site', SiteView

	about: (params) -> 
		@view = new AboutView
			autoRender : true
			region : "main"
