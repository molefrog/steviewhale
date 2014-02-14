(function(/*! Brunch !*/) {
  'use strict';

  var globals = typeof window !== 'undefined' ? window : global;
  if (typeof globals.require === 'function') return;

  var modules = {};
  var cache = {};

  var has = function(object, name) {
    return ({}).hasOwnProperty.call(object, name);
  };

  var expand = function(root, name) {
    var results = [], parts, part;
    if (/^\.\.?(\/|$)/.test(name)) {
      parts = [root, name].join('/').split('/');
    } else {
      parts = name.split('/');
    }
    for (var i = 0, length = parts.length; i < length; i++) {
      part = parts[i];
      if (part === '..') {
        results.pop();
      } else if (part !== '.' && part !== '') {
        results.push(part);
      }
    }
    return results.join('/');
  };

  var dirname = function(path) {
    return path.split('/').slice(0, -1).join('/');
  };

  var localRequire = function(path) {
    return function(name) {
      var dir = dirname(path);
      var absolute = expand(dir, name);
      return globals.require(absolute, path);
    };
  };

  var initModule = function(name, definition) {
    var module = {id: name, exports: {}};
    cache[name] = module;
    definition(module.exports, localRequire(name), module);
    return module.exports;
  };

  var require = function(name, loaderPath) {
    var path = expand(name, '.');
    if (loaderPath == null) loaderPath = '/';

    if (has(cache, path)) return cache[path].exports;
    if (has(modules, path)) return initModule(path, modules[path]);

    var dirIndex = expand(path, './index');
    if (has(cache, dirIndex)) return cache[dirIndex].exports;
    if (has(modules, dirIndex)) return initModule(dirIndex, modules[dirIndex]);

    throw new Error('Cannot find module "' + name + '" from '+ '"' + loaderPath + '"');
  };

  var define = function(bundle, fn) {
    if (typeof bundle === 'object') {
      for (var key in bundle) {
        if (has(bundle, key)) {
          modules[key] = bundle[key];
        }
      }
    } else {
      modules[bundle] = fn;
    }
  };

  var list = function() {
    var result = [];
    for (var item in modules) {
      if (has(modules, item)) {
        result.push(item);
      }
    }
    return result;
  };

  globals.require = require;
  globals.require.define = define;
  globals.require.register = define;
  globals.require.list = list;
  globals.require.brunch = true;
})();
require.register("collections/shot-collection", function(exports, require, module) {
var Shot, ShotsCollection, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Shot = require("models/shot");

module.exports = ShotsCollection = (function(_super) {
  __extends(ShotsCollection, _super);

  function ShotsCollection() {
    _ref = ShotsCollection.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  ShotsCollection.prototype.model = Shot;

  ShotsCollection.prototype.url = "/api/shots";

  return ShotsCollection;

})(Chaplin.Collection);
});

;require.register("collections/station-collection", function(exports, require, module) {
var Station, StationCollection, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Station = require("models/station");

module.exports = StationCollection = (function(_super) {
  __extends(StationCollection, _super);

  function StationCollection() {
    _ref = StationCollection.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  StationCollection.prototype.model = Station;

  StationCollection.prototype.url = "/api/stations";

  return StationCollection;

})(Chaplin.Collection);
});

;require.register("controllers/shots-controller", function(exports, require, module) {
var Shot, ShotCollection, ShotCollectionView, ShotView, ShotsController, SiteView, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

SiteView = require("views/site-view");

Shot = require("models/shot");

ShotView = require("views/shot-view");

ShotCollection = require("collections/shot-collection");

ShotCollectionView = require("views/shot-collection-view");

module.exports = ShotsController = (function(_super) {
  __extends(ShotsController, _super);

  function ShotsController() {
    _ref = ShotsController.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  ShotsController.prototype.beforeAction = function() {
    return this.reuse('site', SiteView);
  };

  ShotsController.prototype.index = function() {
    var _this = this;
    this.collection = new ShotCollection;
    this.view = new ShotCollectionView({
      collection: this.collection,
      region: "main"
    });
    return this.collection.fetch().then(function() {
      return _this.view.render();
    });
  };

  ShotsController.prototype.show = function(params) {
    var _this = this;
    this.model = new Shot({
      _id: params.id
    });
    this.view = new ShotView({
      model: this.model,
      region: "main"
    });
    return this.model.fetch().then(function() {
      return _this.view.render();
    });
  };

  return ShotsController;

})(Chaplin.Controller);
});

;require.register("controllers/static-controller", function(exports, require, module) {
var AboutView, SiteView, StaticController, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

SiteView = require("views/site-view");

AboutView = require("views/about-view");

module.exports = StaticController = (function(_super) {
  __extends(StaticController, _super);

  function StaticController() {
    _ref = StaticController.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  StaticController.prototype.beforeAction = function() {
    return this.reuse('site', SiteView);
  };

  StaticController.prototype.about = function(params) {
    return this.view = new AboutView({
      autoRender: true,
      region: "main"
    });
  };

  return StaticController;

})(Chaplin.Controller);
});

;require.register("controllers/stations-controller", function(exports, require, module) {
var SiteView, Station, StationCollection, StationCollectionView, StationsController, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

SiteView = require("views/site-view");

Station = require("/models/station");

StationCollection = require("/collections/station-collection");

StationCollectionView = require("/views/station-collection-view");

module.exports = StationsController = (function(_super) {
  __extends(StationsController, _super);

  function StationsController() {
    _ref = StationsController.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  StationsController.prototype.beforeAction = function() {
    return this.reuse('site', SiteView);
  };

  StationsController.prototype.index = function(params) {
    var _this = this;
    this.collection = new StationCollection;
    this.view = new StationCollectionView({
      collection: this.collection,
      region: "main"
    });
    return this.collection.fetch().then(function() {
      return _this.view.render();
    });
  };

  return StationsController;

})(Chaplin.Controller);
});

;require.register("initialize", function(exports, require, module) {
/*
 Application's initialization routine
*/

$(function() {
  return new Chaplin.Application({
    controllerSuffix: '-controller',
    pushState: true,
    routes: require("routes")
  });
});
});

;require.register("models/shot", function(exports, require, module) {
var Shot, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

module.exports = Shot = (function(_super) {
  __extends(Shot, _super);

  function Shot() {
    _ref = Shot.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  Shot.prototype.idAttribute = "_id";

  Shot.prototype.urlRoot = "/api/shots";

  Shot.prototype.url = function() {
    return "/api/shots/" + this.id;
  };

  return Shot;

})(Chaplin.Model);
});

;require.register("models/station", function(exports, require, module) {
var Station, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

module.exports = Station = (function(_super) {
  __extends(Station, _super);

  function Station() {
    _ref = Station.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  Station.prototype.urlRoot = "/api/stations";

  Station.prototype.url = function() {
    return "/api/stations/" + (this.get('name'));
  };

  return Station;

})(Chaplin.Model);
});

;require.register("routes", function(exports, require, module) {
module.exports = function(match) {
  match("stations", "stations#index");
  match("stations/:id", "stations#show");
  match("shots", "shots#index");
  match("shots/:id", "shots#show");
  return match("", "static#about");
};
});

;require.register("views/about-view", function(exports, require, module) {
var AboutView, View, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

View = require("views/base/base");

module.exports = AboutView = (function(_super) {
  __extends(AboutView, _super);

  function AboutView() {
    _ref = AboutView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  AboutView.prototype.template = require("views/templates/about-template");

  AboutView.prototype.getTemplateData = function() {};

  return AboutView;

})(View);
});

;require.register("views/base/base", function(exports, require, module) {
var View, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

jade.url = Chaplin.utils.reverse;

module.exports = View = (function(_super) {
  __extends(View, _super);

  function View() {
    _ref = View.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  View.prototype.getTemplateFunction = function() {
    return this.template;
  };

  return View;

})(Chaplin.View);
});

;require.register("views/shot-collection-view", function(exports, require, module) {
var ShotCollectionView, ShotListView, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

ShotListView = require("views/shot-list-view");

module.exports = ShotCollectionView = (function(_super) {
  __extends(ShotCollectionView, _super);

  function ShotCollectionView() {
    _ref = ShotCollectionView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  ShotCollectionView.prototype.itemView = ShotListView;

  return ShotCollectionView;

})(Chaplin.CollectionView);
});

;require.register("views/shot-list-view", function(exports, require, module) {
var ShotListView, View, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

View = require("views/base/base");

module.exports = ShotListView = (function(_super) {
  __extends(ShotListView, _super);

  function ShotListView() {
    _ref = ShotListView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  ShotListView.prototype.template = require("views/templates/shot");

  ShotListView.prototype.getTemplateData = function() {
    return {
      shot: this.model
    };
  };

  return ShotListView;

})(View);
});

;require.register("views/shot-view", function(exports, require, module) {
var ShotView, View, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

View = require("views/base/base");

module.exports = ShotView = (function(_super) {
  __extends(ShotView, _super);

  function ShotView() {
    _ref = ShotView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  ShotView.prototype.template = require("views/templates/shot-template");

  ShotView.prototype.getTemplateData = function() {
    return {
      shot: this.model
    };
  };

  return ShotView;

})(View);
});

;require.register("views/site-view", function(exports, require, module) {
var SiteView, View, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

View = require('views/base/base');

module.exports = SiteView = (function(_super) {
  __extends(SiteView, _super);

  function SiteView() {
    _ref = SiteView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  SiteView.prototype.container = 'body';

  SiteView.prototype.id = 'site-container';

  SiteView.prototype.regions = {
    url: '#page-url',
    main: '#main-container',
    navigation: '#nav-container'
  };

  SiteView.prototype.template = require('./templates/site');

  return SiteView;

})(View);
});

;require.register("views/station-collection-view", function(exports, require, module) {
var StationCollectionView, StationListView, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

StationListView = require("views/station-list-view");

module.exports = StationCollectionView = (function(_super) {
  __extends(StationCollectionView, _super);

  function StationCollectionView() {
    _ref = StationCollectionView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  StationCollectionView.prototype.itemView = StationListView;

  return StationCollectionView;

})(Chaplin.CollectionView);
});

;require.register("views/station-list-view", function(exports, require, module) {
var StationView, View, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

View = require("views/base/base");

module.exports = StationView = (function(_super) {
  __extends(StationView, _super);

  function StationView() {
    _ref = StationView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  StationView.prototype.template = require("views/templates/station");

  StationView.prototype.getTemplateData = function() {
    return {
      station: this.model
    };
  };

  return StationView;

})(View);
});

;require.register("views/templates/about-template", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};

buf.push("<h1>#steviewhale</h1><img src=\"/images/stevie.svg\"/>");;return buf.join("");
};
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
});

;require.register("views/templates/shot-template", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),shot = locals_.shot;
buf.push("<div class=\"container\"><div class=\"row\"><img" + (jade.attr("src", "" + ( shot.attributes.image ) + "", true, false)) + " width=\"400\" height=\"400\" class=\"img-rounded\"/><p class=\"lead\">Опубликовано " + (jade.escape((jade.interp = shot.attributes.instagram.user.username) == null ? '' : jade.interp)) + "</p></div></div>");;return buf.join("");
};
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
});

;require.register("views/templates/shot", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),shot = locals_.shot;
buf.push("<a" + (jade.attr("href", jade.url('shots#show', { id : shot.id }), true, false)) + "><img" + (jade.attr("src", "" + ( shot.attributes.thumbnail ) + "", true, false)) + " class=\"img-rounded\"/></a>");;return buf.join("");
};
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
});

;require.register("views/templates/site", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};

buf.push("<div class=\"container\"><ul class=\"nav nav-pills\"><li><a" + (jade.attr("href", jade.url("static#about"), true, false)) + ">О Проекте</a></li><li><a" + (jade.attr("href", "" + (jade.url('stations#index')) + "", true, false)) + ">Печатные Станции</a></li><li><a" + (jade.attr("href", "" + (jade.url('shots#index')) + "", true, false)) + ">Фотографии</a></li></ul><div id=\"main-container\"></div></div>");;return buf.join("");
};
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
});

;require.register("views/templates/station", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),station = locals_.station;
buf.push("<div class=\"station-item\"><h3>" + (jade.escape(null == (jade.interp = station.get("title") ) ? "" : jade.interp)) + " <span class=\"label label-success\">Онлайн</span></h3><p class=\"lead\">" + (jade.escape(null == (jade.interp = station.get("description")) ? "" : jade.interp)) + "</p></div>");;return buf.join("");
};
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
});

;
//# sourceMappingURL=app.js.map