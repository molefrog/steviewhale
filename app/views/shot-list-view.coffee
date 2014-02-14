View = require "views/base/base"

module.exports = class ShotListView extends View
	template : require "views/templates/shot"

	getTemplateData : ->
		shot : @model
