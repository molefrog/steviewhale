View = require "views/base/base"

Station           = require "models/station"
StationCollection = require "collections/stationCollection"

module.exports = class StationCreateView extends View
  initialize : ->
    @delegate "click", ".register-button", @register

  register : ->
    fields =
      title : @$(".title-input").val()
      subtitle : @$(".subtitle-input").val()

    dummy = new StationCollection
    dummy.create fields,
      success : ->
        Chaplin.utils.redirectTo("stations#index")



  template : require "./stationCreateView_"

  getTemplateData : ->
