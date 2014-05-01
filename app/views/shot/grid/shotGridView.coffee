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

    do @loadNextPortion


  className : "shot-grid-view"
  template : require "./shotGridView_"

  loading : false

  showLoader : -> @$('.load-spinner').fadeIn(100)
  hideLoader : -> @$('.load-spinner').fadeOut(100)

  loadNextPortion : ->
    return if @loading

    if @collection.meta?
      if @collection.meta.count >= @collection.meta.total
        return

    @loading = true

    do @showLoader

    query = {}

    unless @collection.isEmpty()
      query.max_timestamp = _.min @collection.map (s) ->
        moment( s.attributes.created ).unix()

    @collection.fetch
      data : query
      error : =>
        @loading = false
        do @hideLoader

      success : (models) =>
        @loading = false
        do @hideLoader

        views = models.map (model) =>
          view = new ShotGridItemView { model }
          view.render()
          view.el

          imagesLoaded(view.el).on 'always', =>
            @$(".shot-grid").append( view.el )
            @masonry.appended view.el

            setTimeout ->
              view.$el.addClass 'shown'
            , _.random(10, 400)
            @masonry.layout()


  render : ->
    super
    # Initialize Masonry grid
    @masonry = new Masonry @$('.shot-grid')[0],
      columnWidth  : ".shot-grid-item"
      itemSelector : ".shot-grid-item"
      transitionDuration : 0

