jade.url = Chaplin.utils.reverse

jade.markdown = do ->
	converter = new Showdown.converter()
	_.bind converter.makeHtml, converter

 
# Base view.
module.exports = class View extends Chaplin.View
	# Precompiled templates function initializer.
	getTemplateFunction: ->
		@template