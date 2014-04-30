ShotGridItemView = require "./item/shotGridItemView"
CollectionView   = require "views/base/collectionView"
View             = require "views/base/base"
ShotCollection  = require "collections/shotCollection"

module.exports = class ShotGridView extends View
  initialize : ->
    super
    do @render
    @collection = new ShotCollection

    # @listenTo @collection, 'add', (model, collection, options) =>
    # @listenTo @collection, 'request', ->
    # @listenTo @collection, 'sync', ->
    # @listenTo @collection, 'error', ->

    @delegate "click", ".super-button", @loadNextPortion

    do @loadNextPortion


  className : "shot-grid-view"
  template : require "./shotGridView_"

  loading : false

  loadNextPortion : ->
    return if @loading

    query = {}

    unless @collection.isEmpty()
      query.max_timestamp = _.min @collection.map (s) ->
        moment( s.attributes.created ).unix()

    @collection.fetch
      data : query
      error : =>
        @loading = false
      success : (models) =>
        @loading = false

        views = models.map (model) =>
          view = new ShotGridItemView { model }
          view.render()
          view.el

          im = imagesLoaded view.el
          im.on 'always', =>
            @$(".shot-grid").append( view.el )
            @masonry.appended view.el
            view.$el.addClass 'shown'
            @masonry.layout()


    @loading = true


  render : ->
    super
    # Initialize Masonry grid
    @masonry = new Masonry @$('.shot-grid')[0],
      columnWidth  : ".shot-grid-item"
      itemSelector : ".shot-grid-item"
      transitionDuration : 0

