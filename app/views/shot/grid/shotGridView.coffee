ShotGridItemView = require "./item/shotGridItemView"

module.exports = class ShotGridView extends Chaplin.CollectionView
	
	
	animationDuration : 300
	itemView : ShotGridItemView

	listSelector : ".shot-grid"

	# loadingSelector : ".loading-container"

	template : require "./shotGridView_"


	getTemplateData : ->
	getTemplateFunction: ->
		@template