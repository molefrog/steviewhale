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