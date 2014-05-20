View    = require "views/base/base"
Storage = require "storage"
Shot    = require "models/shot"


module.exports = class ShotGridItemView extends View
  className: "shot-grid-item"

  initialize: ->
    super

    @listenTo @model, 'change:status', =>
      do @updateStatus

    @listenTo @model, 'remove', =>
      @$el.removeClass 'shown'
      setTimeout =>
        @remove()
        @masonry?.layout()
      , 300


    @delegate "click", ".delete-button", @deleteHandler
    @delegate "click", ".print-button",  @printHandler

  updateStatus : ->
    @$('.status-indicator').removeClass('initial queued printed failed')
    @$('.status-indicator').addClass( @model.get('status') )
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

  render : ->
    super
    do @updateStatus