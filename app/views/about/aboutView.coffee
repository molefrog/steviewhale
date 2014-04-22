View = require "views/base/base"

module.exports = class AboutView extends View
  _.extend @prototype, Chaplin.EventBroker

  initialize : ->
    @subscribeEvent 'window-resized', @onResize
    super

  dispose : ->
    do @turnSlideshowOff
    super

  ###
  # Slideshow-related methods
  ###
  numberOfSlides : 5
  slideshowInterval : 5000
  slideshowStopped : false

  slideshowHandler : ->
    unless @currentSlide
      @currentSlide = _.sample _.range(1, @numberOfSlides + 1)
    else
      @currentSlide = (@currentSlide + 1) % @numberOfSlides + 1

    prevSlide = @$('.slide.active')
    nextSlide = @$('.slide:not(.active)')

    imageUrl = "/images/slideshow/landing-bg-#{@currentSlide}.png"

    nextSlide.css
      'background-image' : "url('#{imageUrl}')"

    self = @
    $('<img/>').attr('src', imageUrl).load ->
      $(@).remove()

      prevSlide.removeClass 'active'
      nextSlide.addClass 'active'

      unless self.slideshowStopped
        self.timeoutHandle = setTimeout _.bind(self.slideshowHandler, self), self.slideshowInterval

  turnSlideshowOff : ->
    if @timeoutHandle
      clearTimeout @timeoutHandle
      @intervalHandle = null
    @slideshowStopped = true

  turnSlideshowOn : ->
    do @turnSlideshowOff
    @slideshowStopped = false
    do @slideshowHandler

  ###
  # Resize and render
  ###
  onResize : (w, h) ->
    @$('.full-height').height(h)

  render : ->
    super
    do @turnSlideshowOn
    @$('.full-height').height( $(window).height() )

  template : require "./aboutView_"

  getTemplateData : ->
