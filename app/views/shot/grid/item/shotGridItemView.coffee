View    = require "views/base/base"
Storage = require "storage"
Shot    = require "models/shot"


module.exports = class ShotGridItemView extends View
  className: "shot-grid-item"

  initialize: ->
    super

    @listenTo @model, 'destroy', =>
      @remove()


    @delegate "click", ".delete-button", @deleteHandler
    @delegate "click", ".print-button",  @printHandler

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
