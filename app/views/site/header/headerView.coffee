View = require 'views/base/base'

# Site view is a top-level view which is bound to body.
module.exports = class HeaderView extends View
  template: require './headerView_'

  className : 'header-view-container'

  initialize : ->
    Chaplin.mediator.subscribe 'dispatcher:dispatch', @onDispatch
    Chaplin.mediator.subscribe 'loginState', @onLoginChanged
    super

  onLoginChanged : (user) =>
    do @render

  onDispatch : (currentController, params, route, options) =>
    # # Make active navigation links
    action = route.controller.split('/')[0]
    @$('.site-navigation li.selected').removeClass('selected')
    @$(".site-navigation li.nav-#{action}").addClass('selected')

    if action is 'static'
      @$el.addClass('static-page')
    else
      @$el.removeClass('static-page')

