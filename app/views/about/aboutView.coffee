View = require "views/base/base"

module.exports = class AboutView extends View
  _.extend @prototype, Chaplin.EventBroker

  initialize : ->
    @subscribeEvent 'window-resized', @onResize
    super

  onResize : (w, h) ->
    @$('.landing').height(h)

  render : ->
    super
    @$('.landing').height( $(window).height() )

  template : require "./aboutView_"

  getTemplateData : ->
