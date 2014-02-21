View = require "views/base/base"

module.exports = class ShotView extends View
	template : require "./shotView_"

	getTemplateData : ->
		shot : @model
