routes = require "routes"

$ ->
# Initialize new Chaplin application.
# Specify controller suffix for clarity.
	new Chaplin.Application
		controllerSuffix: '-controller'
		pushState: false
		routes: routes