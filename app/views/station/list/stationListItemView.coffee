View = require "views/base/base"
Storage = require "storage"

module.exports = class StationListItemView extends View
  template : require "./stationListItemView_"

  getTemplateData : ->
    station : @model.attributes
