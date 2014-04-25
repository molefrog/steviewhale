View    = require "views/base/base"
Storage = require "storage"
Shot    = require "models/shot"


module.exports = class ShotGridItemView extends View
  className: "shot-grid-item col-lg-3 col-md-3 col-sm-4 col-xs-6"

  initialize: ->
    super
    @delegate "click", ".delete-button", @deleteHandler
    @delegate "click", ".print-button",   @printHandler

  deleteHandler : ->
    if confirm 'Удалить фотографию?'
      @model.destroy
        wait : true

  printHandler: ->
    if confirm 'Напечатать фотографию?'
      do @model.print

  template : require "./shotGridItemView_"

  getTemplateData : ->
    shot : @model.attributes
