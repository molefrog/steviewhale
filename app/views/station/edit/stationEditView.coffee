View    = require "views/base/base"
Station = require "models/station"

module.exports = class StationEditView extends View
  model : Station

  template : require "./stationEditView_"

  initialize : ->
    @delegate 'click', '.save-button', @save

  save : ->
    fields =
      name        : @$(".name-input").val()
      title       : @$(".title-input").val()
      subtitle    : @$(".subtitle-input").val()
      description : @$(".desc-input").val()
      hashtag     : @$(".hashtag-input").val()
      instructions: @$(".instructions-input").val()

    @model.save fields,
      success : =>
        Chaplin.utils.redirectTo "stations#show",
          name : @model.attributes.name

  getTemplateData : ->
    station : @model.attributes
