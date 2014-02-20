LoginView = require "views/auth/loginView"
SiteView = require "views/site/siteView"

Storage = require "storage"

module.exports = class LoginController extends Chaplin.Controller
	beforeAction : ->
		# Site view declares “main” region.
		@reuse 'site', SiteView

	login : ->
		@view = new LoginView
			region : "main"
			autoRender : true 

	logout : ->
		$.post("/api/auth/logout")
		.then =>
			Storage.user = null
			@redirectTo "static#about"
