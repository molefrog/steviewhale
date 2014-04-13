Storage = require "storage"

# The application object.
module.exports = class Application extends Chaplin.Application
  start: ->

    # Get auth state from the server
    $.get "/api/auth", (data) =>
      if data.auth
        Storage.user = data.user

      super
