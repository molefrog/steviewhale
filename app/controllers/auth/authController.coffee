Storage = require "storage"

module.exports = class AuthController extends Chaplin.Controller 
  beforeAction: (params, route) ->
    if not Storage.user?
      Storage.redirectUrl = window.location.pathname
      @redirectTo 'auth_login' 

