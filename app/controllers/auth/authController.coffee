Storage = require "storage"

BaseController = require "controllers/base/baseController"

module.exports = class AuthController extends BaseController
  beforeAction: (params, route) ->
    super
    if not Storage.user?
      Storage.redirectUrl = window.location.pathname
      @redirectTo 'auth_login'

