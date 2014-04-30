module.exports = class Shot extends Chaplin.Model
  _.extend @prototype, Chaplin.SyncMachine

  initialize: ->
    super
    @on 'request', @beginSync
    @on 'sync', @finishSync
    @on 'error', @unsync

  idAttribute : "_id"

  urlRoot : "/api/shots"

  print : ->
    $.get("#{@url()}/queue")
    .done =>
      @.set "status", "queued"
