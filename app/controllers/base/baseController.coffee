SiteView = require "views/site/siteView"
HeaderView = require "views/site/header/headerView"

module.exports = class BaseController extends Chaplin.Controller
  beforeAction : ->
    super
    @reuse 'site', SiteView
    @reuse 'header', HeaderView, region: 'header'

