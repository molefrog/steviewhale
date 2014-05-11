ShotGridItemView = require "./item/shotGridItemView"
CollectionView   = require "views/base/collectionView"
View             = require "views/base/base"
ShotCollection  = require "collections/shotCollection"

module.exports = class ShotGridView extends View
  _.extend @prototype, Chaplin.EventBroker

  initialize : ->
    super
    do @render
    @collection = new ShotCollection
    @subscribeEvent 'window-scrolled-bottom', @loadNextPortion

    @listenTo @collection, "remove", =>
      @masonry.layout()

    do @loadNextPortion


  className : "shot-grid-view"
  template : require "./shotGridView_"

  loading : false

  startLoading : ->
    return false if @loading
    @loading = true
    @$('.load-spinner').fadeIn(100)
    true

  stopLoading : ->
    return false unless @loading
    @loading = false
    @$('.load-spinner').fadeOut(100)
    true

  loadNextPortion : ->
    # If there is no more data to load
    if @collection.meta?
      if @collection.meta.count >= @collection.meta.total
        return

    return unless do @startLoading

    query = {
      limit : 10
    }

    unless @collection.isEmpty()
      query.max_timestamp = _.min @collection.map (s) ->
        moment( s.attributes.created ).unix()

    @collection.fetch
      data : query
      error : =>
        do @stopLoading

      success : (models) =>
        views = models.sortBy (model) ->
          -moment( model.get('created') ).unix()
        .map (model) =>
          view = new ShotGridItemView { model }
          view.render()
          view

        viewEls = _.map views, (v) -> v.el

        imagesLoaded( viewEls ).on 'always', =>
          do @stopLoading

          @$(".shot-grid").append( viewEls )
          @masonry.appended viewEls
          @masonry.layout()

          delay = 0
          _.each views, (v) =>
            v.loadHighResolution()

          _.each viewEls, (v) =>
            setTimeout =>
              $(v).addClass 'shown'
            , delay

            delay += _.random(10, 60)


  render : ->
    super

    # Initialize Masonry grid
    @masonry = new Masonry @$('.shot-grid')[0],
      columnWidth  : ".shot-grid-item"
      itemSelector : ".shot-grid-item"
      transitionDuration : 0

    @masonry.bindResize()

