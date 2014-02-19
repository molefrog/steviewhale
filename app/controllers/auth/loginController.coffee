LoginView = require "views/auth/loginView"
SiteView = require "views/site/siteView"

module.exports = class LoginController extends Chaplin.Controller
	beforeAction : ->
		# Site view declares “main” region.
		@reuse 'site', SiteView

	login : ->
		@view = new LoginView
			region : "main"
			autoRender : true 

	logout : ->
