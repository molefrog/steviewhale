View = require "views/base/base"

module.exports = class ShotView extends View
	template : require "views/templates/shot-template"

	getTemplateData : ->
		shot : @model
