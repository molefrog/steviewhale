View = require "views/base/base"

module.exports = class ShotView extends View
	template : require "./shotViewTemplate"

	getTemplateData : ->
		shot : @model
