StationListItemView = require "./stationListItemView"

module.exports = class StationListView extends Chaplin.CollectionView
	animationDuration : 300
	itemView : StationListItemView