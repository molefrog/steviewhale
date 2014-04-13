View = require 'views/base/base'

# Site view is a top-level view which is bound to body.
module.exports = class SiteView extends View
  container: 'body'

  id: 'site-container'

  regions:
    url: '#page-url'
    main: '#main-container'
    navigation: '#nav-container'

  template: require './siteView_'

  initialize : ->
    Chaplin.mediator.subscribe 'dispatcher:dispatch', @onDispatch
    Chaplin.mediator.subscribe 'loginState', @onLoginChanged
    super

  onLoginChanged : (user) =>
    do @render

  onDispatch : (currentController, params, route, options) =>
    # Make active navigation links
    action = route.controller.split('/')[0]
    @$('.site-navigation li.selected').removeClass('selected')
    @$(".site-navigation li.nav-#{action}").addClass('selected')
