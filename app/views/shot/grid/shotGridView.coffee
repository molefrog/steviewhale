ShotGridItemView = require "./item/shotGridItemView"
CollectionView   = require "views/base/collectionView"


module.exports = class ShotGridView extends CollectionView
	className : "shot-grid-view"

	listSelector : ".shot-grid"

	itemView : ShotGridItemView

	template : require "./shotGridView_"

