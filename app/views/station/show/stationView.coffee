View    = require "views/base/base"
Station = require "models/station"

module.exports = class StationView extends View
  model : Station

  initialize : ->
    @delegate "click", ".delete-confirm-button", @deleteStation
    @delegate "click", ".secret-button", @showSecret
  
  deleteStation : ->
    @$(".delete-modal").modal("hide")
    @model.destroy
      success : =>
        Chaplin.utils.redirectTo "stations#index"

  showSecret : ->
    @model.secret (secret) => 
      @$(".secret-modal .secret-field").text(secret)
      @$(".secret-modal").modal("show")


  template : require "./stationView_"

  render : ->
    super
    canvas = @$(".video-canvas")[0]
    ctx = canvas.getContext '2d'

    streamingText = "Прямой эфир выключен"
    if @model.get "streaming"
      streamingText = "Живая трансляция станции"

    @$('.tooltip-button').tooltip
      placement : 'top'
      title : streamingText

    if @model.get "streaming"
      wsAddress = "ws://#{window.location.hostname}:3030/#{@model.attributes.name}"

      @client = new WebSocket( wsAddress )
      @player = new jsmpeg @client, 
        canvas : canvas

  getTemplateData : ->
    station : @model.attributes
