
jade.url = (routeName, params..., options) ->
		Chaplin.utils.reverse routeName, params

 
# Base view.
module.exports = class View extends Chaplin.View
	# Precompiled templates function initializer.
	getTemplateFunction: ->
		@template