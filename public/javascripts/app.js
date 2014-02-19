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
require.register("collections/shotCollection", function(exports, require, module) {
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

;require.register("collections/stationCollection", function(exports, require, module) {
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

;require.register("controllers/auth/authController", function(exports, require, module) {
var AuthController, Storage, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Storage = require("storage");

module.exports = AuthController = (function(_super) {
  __extends(AuthController, _super);

  function AuthController() {
    _ref = AuthController.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  AuthController.prototype.beforeAction = function(params, route) {
    if (Storage.user == null) {
      Storage.redirectUrl = window.location.pathname;
      return this.redirectTo('auth_login');
    }
  };

  return AuthController;

})(Chaplin.Controller);
});

;require.register("controllers/auth/loginController", function(exports, require, module) {
var LoginController, LoginView, SiteView, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

LoginView = require("views/auth/loginView");

SiteView = require("views/site/siteView");

module.exports = LoginController = (function(_super) {
  __extends(LoginController, _super);

  function LoginController() {
    _ref = LoginController.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  LoginController.prototype.beforeAction = function() {
    return this.reuse('site', SiteView);
  };

  LoginController.prototype.login = function() {
    return this.view = new LoginView({
      region: "main",
      autoRender: true
    });
  };

  LoginController.prototype.logout = function() {};

  return LoginController;

})(Chaplin.Controller);
});

;require.register("controllers/auth/stationAuthController", function(exports, require, module) {
var AuthController, SiteView, Station, StationEditView, stationAuthController, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AuthController = require("./authController");

Station = require("models/station");

StationEditView = require("views/station/edit/stationEditView");

SiteView = require("views/site/siteView");

module.exports = stationAuthController = (function(_super) {
  __extends(stationAuthController, _super);

  function stationAuthController() {
    _ref = stationAuthController.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  stationAuthController.prototype.beforeAction = function() {
    stationAuthController.__super__.beforeAction.apply(this, arguments);
    return this.reuse('site', SiteView);
  };

  stationAuthController.prototype.edit = function(params) {
    var _this = this;
    this.model = new Station({
      name: params.name
    });
    this.view = new StationEditView({
      model: this.model,
      region: "main",
      autoRender: true
    });
    return this.model.fetch().then(function() {
      return _this.view.render();
    });
  };

  return stationAuthController;

})(AuthController);
});

;require.register("controllers/shotsController", function(exports, require, module) {
var Shot, ShotView, ShotsController, SiteView, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

SiteView = require("views/site/siteView");

Shot = require("models/shot");

ShotView = require("views/shot/shotView");

module.exports = ShotsController = (function(_super) {
  __extends(ShotsController, _super);

  function ShotsController() {
    _ref = ShotsController.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  ShotsController.prototype.beforeAction = function() {
    return this.reuse('site', SiteView);
  };

  ShotsController.prototype.index = function() {};

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

;require.register("controllers/staticController", function(exports, require, module) {
var AboutView, SiteView, StaticController, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

SiteView = require("views/site/siteView");

AboutView = require("views/about/aboutView");

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

;require.register("controllers/stationsController", function(exports, require, module) {
var SiteView, Station, StationCollection, StationEditView, StationListView, StationView, StationsController, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

SiteView = require("views/site/siteView");

Station = require("/models/station");

StationCollection = require("/collections/stationCollection");

StationListView = require("/views/station/list/stationListView");

StationEditView = require("/views/station/edit/stationEditView");

StationView = require("/views/station/stationView");

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
    this.view = new StationListView({
      collection: this.collection,
      region: "main"
    });
    return this.collection.fetch().then(function() {
      return _this.view.render();
    });
  };

  StationsController.prototype.show = function(params) {
    var _this = this;
    this.model = new Station({
      name: params.name
    });
    this.view = new StationView({
      model: this.model,
      region: "main"
    });
    return this.model.fetch().then(function() {
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
    controllerSuffix: 'Controller',
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
  match("stations/:name", "stations#show");
  match("stations/:name/edit", {
    controller: "auth/stationAuth",
    action: "edit",
    name: "station_edit"
  });
  match("auth/login", {
    controller: "auth/login",
    action: "login",
    name: "auth_login"
  });
  match("shots", "shots#index");
  match("shots/:id", "shots#show");
  return match("", "static#about");
};
});

;require.register("storage", function(exports, require, module) {
var Storage;

module.exports = Storage = (function() {
  function Storage() {}

  return Storage;

})();
});

;require.register("views/about/aboutView", function(exports, require, module) {
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

  AboutView.prototype.template = require("./aboutViewTemplate");

  AboutView.prototype.getTemplateData = function() {};

  return AboutView;

})(View);
});

;require.register("views/about/aboutViewTemplate", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};

buf.push("<div class=\"jumbotron text-center landing\"><h1>#steviewhale</h1><p>Моментальная печать фотографий из Instagram</p><img src=\"/images/stevie.svg\" class=\"img-responsive\"/></div>");;return buf.join("");
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

;require.register("views/auth/loginView", function(exports, require, module) {
var LoginView, Storage, View, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

View = require("views/base/base");

Storage = require("storage");

module.exports = LoginView = (function(_super) {
  __extends(LoginView, _super);

  function LoginView() {
    _ref = LoginView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  LoginView.prototype.initialize = function() {
    return this.delegate("click", ".login-button", this.login);
  };

  LoginView.prototype.loginSuccess = function(user) {
    Storage.user = user;
    if (Storage.redirectUrl != null) {
      return Chaplin.utils.redirectTo({
        url: Storage.redirectUrl
      });
    } else {
      return Chaplin.utils.redirectTo("static#about");
    }
  };

  LoginView.prototype.login = function() {
    var data,
      _this = this;
    data = {
      username: this.$(".login-field").val(),
      password: this.$(".password-field").val()
    };
    return $.post('/api/auth/login', data).done(function(data) {
      return _this.loginSuccess(data.user);
    }).fail(function() {
      return alert("fail");
    });
  };

  LoginView.prototype.template = require("./loginViewTemplate");

  LoginView.prototype.getTemplateData = function() {};

  return LoginView;

})(View);
});

;require.register("views/auth/loginViewTemplate", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};

buf.push("<div class=\"row\"><div class=\"col-md-4 col-md-offset-4\"><form role=\"form\" class=\"login-form\"><h2>Авторизация</h2><div class=\"form-group form-group-lg\"><input type=\"text\" placeholder=\"Логин\" class=\"login-field form-control\"/><input type=\"password\" placeholder=\"Пароль\" class=\"password-field form-control\"/></div><div class=\"login-button btn btn-lg btn-primary btn-block\">Войти</div></form></div></div>");;return buf.join("");
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

;require.register("views/shot/shotView", function(exports, require, module) {
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

  ShotView.prototype.template = require("./shotViewTemplate");

  ShotView.prototype.getTemplateData = function() {
    return {
      shot: this.model
    };
  };

  return ShotView;

})(View);
});

;require.register("views/shot/shotViewTemplate", function(exports, require, module) {
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

;require.register("views/site/siteView", function(exports, require, module) {
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

  SiteView.prototype.template = require('./siteViewTemplate');

  return SiteView;

})(View);
});

;require.register("views/site/siteViewTemplate", function(exports, require, module) {
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

;require.register("views/station/edit/stationEditTemplate", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),station = locals_.station;
buf.push("<div role=\"form\" class=\"form\"><div class=\"form-group\"><label>Название</label><input type=\"text\"" + (jade.attr("value", station.title, true, false)) + " class=\"title-input form-control\"/></div><div class=\"form-group\"><label>Подзаголовок</label><input type=\"text\"" + (jade.attr("value", station.description, true, false)) + " class=\"form-control\"/></div><div class=\"form-group\"><label>Описание <small>(Поддерживает Markdown)</small></label><textarea rows=\"5\"" + (jade.attr("text", station.description, true, false)) + " class=\"form-control\">" + (jade.escape(null == (jade.interp = station.description) ? "" : jade.interp)) + "</textarea></div><div class=\"row\"><div class=\"col-md-4 col-md-offset-4\"><div class=\"login-button btn btn-primary btn-lg btn-block save-button\">Сохранить</div></div></div></div>");;return buf.join("");
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

;require.register("views/station/edit/stationEditView", function(exports, require, module) {
var Station, StationEditView, View, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

View = require("views/base/base");

Station = require("models/station");

module.exports = StationEditView = (function(_super) {
  __extends(StationEditView, _super);

  function StationEditView() {
    _ref = StationEditView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  StationEditView.prototype.model = Station;

  StationEditView.prototype.template = require("./stationEditTemplate");

  StationEditView.prototype.initialize = function() {
    return this.delegate('click', '.save-button', this.save);
  };

  StationEditView.prototype.save = function() {
    this.model.set({
      title: this.$(".title-input").val()
    });
    return this.model.save();
  };

  StationEditView.prototype.getTemplateData = function() {
    return {
      station: this.model.attributes
    };
  };

  return StationEditView;

})(View);
});

;require.register("views/station/list/stationListItemTemplate", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),station = locals_.station;
buf.push("<div class=\"station-item\"><h3><a" + (jade.attr("href", jade.url('stations#show', { name : station.name }), true, false)) + ">" + (jade.escape(null == (jade.interp = station.title ) ? "" : jade.interp)) + "</a> ");
switch (station.online){
case true :
buf.push("<span class=\"label label-success\">Онлайн</span>");
  break;
default:
buf.push("<span class=\"label label-warning\">Оффлайн</span>");
  break;
}
buf.push("</h3><p class=\"lead\">" + (jade.escape(null == (jade.interp = station.description) ? "" : jade.interp)) + "</p></div>");;return buf.join("");
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

;require.register("views/station/list/stationListItemView", function(exports, require, module) {
var StationListItemView, View, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

View = require("views/base/base");

module.exports = StationListItemView = (function(_super) {
  __extends(StationListItemView, _super);

  function StationListItemView() {
    _ref = StationListItemView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  StationListItemView.prototype.template = require("./stationListItemTemplate");

  StationListItemView.prototype.getTemplateData = function() {
    return {
      station: this.model.attributes
    };
  };

  return StationListItemView;

})(View);
});

;require.register("views/station/list/stationListView", function(exports, require, module) {
var StationListItemView, StationListView, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

StationListItemView = require("./stationListItemView");

module.exports = StationListView = (function(_super) {
  __extends(StationListView, _super);

  function StationListView() {
    _ref = StationListView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  StationListView.prototype.itemView = StationListItemView;

  return StationListView;

})(Chaplin.CollectionView);
});

;require.register("views/station/stationView", function(exports, require, module) {
var Station, StationView, View, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

View = require("views/base/base");

Station = require("models/station");

module.exports = StationView = (function(_super) {
  __extends(StationView, _super);

  function StationView() {
    _ref = StationView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  StationView.prototype.model = Station;

  StationView.prototype.template = require("./stationViewTemplate");

  StationView.prototype.getTemplateData = function() {
    return {
      station: this.model.attributes
    };
  };

  return StationView;

})(View);
});

;require.register("views/station/stationViewTemplate", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),station = locals_.station;
buf.push("<div class=\"station-item\"><h3>" + (jade.escape(null == (jade.interp = station.title ) ? "" : jade.interp)) + " ");
switch (station.online){
case true :
buf.push("<span class=\"label label-success\">Онлайн</span>");
  break;
default:
buf.push("<span class=\"label label-warning\">Оффлайн</span>");
  break;
}
buf.push("</h3><div class=\"btn-group\"><a" + (jade.attr("href", jade.url('station_edit', {name : station.name}), true, false)) + " class=\"btn btn-default\"><span class=\"glyphicon glyphicon-pencil\"></span></a><button class=\"btn btn-default\"><span class=\"glyphicon glyphicon-remove\"></span></button></div><p class=\"lead\">" + (jade.escape(null == (jade.interp = station.description) ? "" : jade.interp)) + "</p></div>");;return buf.join("");
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