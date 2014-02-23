View    = require "views/base/base"
Storage = require "storage"
Shot    = require "models/shot"

module.exports = class ShotGridItemView extends View
	model : Shot
	
	className : "shot-grid-item"

	events : 
		"click" : ->
			alert "234"

	template : require "./shotGridItemView_"

	getTemplateData : ->
		shot : @model.attributes
