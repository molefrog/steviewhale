jade.url = Chaplin.utils.reverse

jade.markdown = do ->
  converter = new Showdown.converter()
  (text) =>
    converter.makeHtml text if text?

Storage = require "storage"
jade.auth = ->
  Storage.user?


 
# Base view.
module.exports = class View extends Chaplin.View
  # Precompiled templates function initializer.
  getTemplateFunction: ->
    @template
