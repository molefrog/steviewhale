###
 Application's initialization routine 
###

$ ->
	# Initialize new Chaplin application.
	# Specify controller suffix for clarity.
	new Chaplin.Application
		controllerSuffix: 'Controller'
		pushState: true
		routes: require "routes"