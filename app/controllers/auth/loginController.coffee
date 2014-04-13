LoginView = require "views/auth/loginView"
SiteView = require "views/site/siteView"

Storage = require "storage"

BaseController = require "controllers/base/baseController"

module.exports = class LoginController extends BaseController
  login : ->
    @view = new LoginView
      region : "main"
      autoRender : true

  logout : ->
    $.post("/api/auth/logout")
    .then =>
      Storage.user = null
      Chaplin.mediator.publish 'loginState', null
      @redirectTo "static#about"
