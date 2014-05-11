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

  ##
  # Function loads high-res version of the photo
  ##
  loadHighResolution : ->
    photo = @model.get 'image_standard'
    el = $('<img>').attr('src', photo)[0]
    imagesLoaded(el).on 'always', =>
      @$('.polaroid-photo').attr('src', photo)

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
