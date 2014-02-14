###
 Application's initialization routine 
###

$ ->
	# Initialize new Chaplin application.
	# Specify controller suffix for clarity.
	new Chaplin.Application
		controllerSuffix: '-controller'
		pushState: true
		routes: require "routes"