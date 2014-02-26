StationListItemView = require "./stationListItemView"

module.exports = class StationListView extends Chaplin.CollectionView
  animationDuration : 300
  itemView : StationListItemView

  listSelector : ".station-list"

  loadingSelector : ".loading-container"

  template : require "./stationListView_"


  getTemplateData : ->
  getTemplateFunction: ->
    @template
