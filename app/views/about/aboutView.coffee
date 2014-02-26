View = require "views/base/base"

module.exports = class AboutView extends View
  template : require "./aboutView_"

  getTemplateData : ->
