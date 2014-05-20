ShotGridItemView = require "./item/shotGridItemView"
CollectionView   = require "views/base/collectionView"
View             = require "views/base/base"
ShotCollection   = require "collections/shotCollection"
Shot             = require "models/shot"

module.exports = class ShotGridView extends View
  _.extend @prototype, Chaplin.EventBroker

  initialize : ->
    super
    do @render
    @collection = new ShotCollection

    @subscribeEvent 'window-scrolled-bottom', @loadNextPortion
    @subscribeEvent 'shot.created', @shotCreated

    @listenTo @collection, "remove", =>
      @masonry.layout()

    do @loadNextPortion


  className : "shot-grid-view"
  template : require "./shotGridView_"

  loading : false

  startLoading : ->
    return false if @loading
    @loading = true
    @$('.load-spinner').show(0)
    true

  stopLoading : ->
    return false unless @loading
    @loading = false
    @$('.load-spinner').hide(0)
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
        sorted = models.sortBy (model) ->
          -moment( model.get('created') ).unix()

        images = sorted.map (model) ->
          $('<img>').attr(src: model.get 'image_thumbnail')[0]

        views = sorted.map (model) =>
          view = new ShotGridItemView { model }
          view.render()
          view

        viewEls = _.map views, (v) -> v.el

        imagesLoaded( images ).on 'always', =>
          do @stopLoading

          @$(".shot-grid").append( viewEls )
          setTimeout =>
            @masonry.appended(viewEls)
            @masonry.layout()

            delay = 0
            _.each views, (v) =>
              v.loadHighResolution()

            _.each viewEls, (v) =>
              setTimeout =>
                $(v).addClass 'shown'
              , delay

              delay += _.random(10, 60)
          , 0


  shotCreated : (shot) ->
    shot = new Shot _id: shot._id

    shot.fetch
      success : (model) =>
        @collection.unshift model

        view = new ShotGridItemView { model }
        view.render()

        imagesLoaded( view.el ).on 'always', =>
          @$('.shot-grid').prepend view.el
          view.loadHighResolution()

          @masonry.prepended( view.el )
          @masonry.layout()

          setTimeout =>
            view.$el.addClass 'shown'
          , 10


  render : ->
    super

    # Initialize Masonry grid
    @masonry = new Masonry @$('.shot-grid')[0],
      columnWidth  : ".shot-grid-item"
      itemSelector : ".shot-grid-item"
      transitionDuration : 0

    @masonry.bindResize()

