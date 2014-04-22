require "utils/analytics/yandexMetrika"
Application = require "application"


###
 Application's initialization routine
###
$ ->
  # Initialize new Chaplin application.
  # Specify controller suffix for clarity.
  new Application
    controllerSuffix: 'Controller'
    pushState: true
    routes: require "routes"

  $(window).resize (e) ->
    Chaplin.mediator.publish 'window-resized', $(window).width(), $(window).height()


