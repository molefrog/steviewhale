SiteView = require "views/siteView"

Shot = require "models/shot"

ShotView = require "views/shot/shotView"
# ShotCollection = require "collections/shot-collection"
# ShotCollectionView = require "views/shot-collection-view"

module.exports = class ShotsController extends Chaplin.Controller
	beforeAction : ->
		# Site view declares “main” region.
		@reuse 'site', SiteView

	index : ->
		# @collection = new ShotCollection
		# @view = new ShotCollectionView
		# 	collection : @collection
		# 	region : "main"

		# @collection.fetch().then =>
		# 	do @view.render

	show : (params) ->
		@model = new Shot 
			_id : params.id

		@view = new ShotView
			model : @model
			region : "main"

		@model.fetch().then =>
			do @view.render

