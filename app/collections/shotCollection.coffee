Shot = require "models/shot"

module.exports = class ShotsCollection extends Chaplin.Collection
  model : Shot
  url : "/api/shots"

  forceLoad : ->
    $.get("#{@url}/load")
    .done =>
      do @fetch
    .fail =>

