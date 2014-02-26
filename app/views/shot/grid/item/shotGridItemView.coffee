View    = require "views/base/base"
Storage = require "storage"
Shot    = require "models/shot"


module.exports = class ShotGridItemView extends View
  className: "shot-grid-item"

  initialize: ->
    super
    @delegate "click", ".delete-confirm", @deleteHandler
    @delegate "click", ".print-button", @printHandler

  deleteHandler : ->
    @model.destroy
      wait : true

  printHandler: ->
    do @model.print

  template : require "./shotGridItemView_"

  getTemplateData : ->
    shot : @model.attributes
