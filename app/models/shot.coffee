module.exports = class Shot extends Chaplin.Model
  _.extend @prototype, Chaplin.SyncMachine

  initialize: ->
    super
    @on 'request', @beginSync
    @on 'sync', @finishSync
    @on 'error', @unsync

  idAttribute : "_id"

  urlRoot : "/api/shots"

  parse : (response, options) ->
    if options.collection then response else response.shot

  print : ->
    $.get("#{@url()}/queue")
    .done =>
