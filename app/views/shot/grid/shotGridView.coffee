ShotGridItemView = require "./item/shotGridItemView"
CollectionView   = require "views/base/collectionView"

module.exports = class ShotGridView extends CollectionView
	# animationDuration : 300
	itemView : ShotGridItemView

	# initialize : ->
	# 	super
	# 	@addCollectionListeners()

	listSelector : ".shot-grid"

	template : require "./shotGridView_"

