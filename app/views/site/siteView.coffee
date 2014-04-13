View = require 'views/base/base'

# Site view is a top-level view which is bound to body.
module.exports = class SiteView extends View
  container: 'body'

  id: 'site-container'

  regions:
    main:   '#main-container'
    header: '#header-container'

  template: require './siteView_'
