View    = require "views/base/base"
Storage = require "storage"
Shot    = require "models/shot"

module.exports = class ShotGridItemView extends View
	model : Shot
	
	className : "shot-grid-item"

	initialize : ->
		@delegate "click", ".delete-confirm", =>
			console.log "sdf"

	template : require "./shotGridItemView_"

	getTemplateData : ->
		shot : @model.attributes
