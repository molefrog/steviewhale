Shot = require "models/shot"

module.exports = class ShotCollection extends Chaplin.Collection
  _.extend @prototype, Chaplin.SyncMachine

  model : Shot

  initialize: ->
    super
    @on 'request', @beginSync
    @on 'sync', @finishSync
    @on 'error', @unsync

  parse : (response, options) ->
    @meta = response.meta
    response.shots

  url : "/api/shots"


