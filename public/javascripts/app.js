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
require.register("application", function(exports, require, module) {
var Application, Storage, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Storage = require("storage");

module.exports = Application = (function(_super) {
  __extends(Application, _super);

  function Application() {
    _ref = Application.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  Application.prototype.start = function() {
    var _this = this;
    return $.get("/api/auth", function(data) {
      if (data.auth) {
        Storage.user = data.user;
      }
      return Application.__super__.start.apply(_this, arguments);
    });
  };

  return Application;

})(Chaplin.Application);
});

;require.register("collections/shotCollection", function(exports, require, module) {
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

  ShotsCollection.prototype.forceLoad = function() {
    var _this = this;
    return $.get("" + this.url + "/load").done(function() {
      return _this.fetch();
    }).fail(function() {});
  };

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

  _.extend(StationCollection.prototype, Chaplin.SyncMachine);

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
var LoginController, LoginView, SiteView, Storage, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

LoginView = require("views/auth/loginView");

SiteView = require("views/site/siteView");

Storage = require("storage");

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

  LoginController.prototype.logout = function() {
    var _this = this;
    return $.post("/api/auth/logout").then(function() {
      Storage.user = null;
      return _this.redirectTo("static#about");
    });
  };

  return LoginController;

})(Chaplin.Controller);
});

;require.register("controllers/auth/stationAuthController", function(exports, require, module) {
var AuthController, SiteView, Station, StationCreateView, StationEditView, stationAuthController, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AuthController = require("./authController");

Station = require("models/station");

StationEditView = require("views/station/edit/stationEditView");

StationCreateView = require("views/station/create/stationCreateView");

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
      region: "main"
    });
    return this.model.fetch().then(function() {
      return _this.view.render();
    });
  };

  stationAuthController.prototype.create = function(params) {
    return this.view = new StationCreateView({
      region: "main",
      autoRender: true
    });
  };

  return stationAuthController;

})(AuthController);
});

;require.register("controllers/shotsController", function(exports, require, module) {
var Shot, ShotCollection, ShotGridView, ShotsController, SiteView, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

SiteView = require("views/site/siteView");

Shot = require("models/shot");

ShotCollection = require("collections/shotCollection");

ShotGridView = require("views/shot/grid/shotGridView");

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
    this.collection = new ShotCollection;
    this.view = new ShotGridView({
      collection: this.collection,
      region: "main"
    });
    return this.collection.fetch();
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

StationView = require("/views/station/show/stationView");

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
var Application;

Application = require("application");

/*
 Application's initialization routine
*/


$(function() {
  return new Application({
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

  Shot.prototype.print = function() {
    var _this = this;
    return $.get("" + (this.url()) + "/queue").done(function() {
      return _this.set("status", "queued");
    });
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

  Station.prototype.idAttribute = "name";

  Station.prototype.urlRoot = "/api/stations";

  return Station;

})(Chaplin.Model);
});

;require.register("routes", function(exports, require, module) {
module.exports = function(match) {
  match("stations", "stations#index");
  match("stations/create", {
    controller: "auth/stationAuth",
    action: "create",
    name: "station_create"
  });
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
  match("auth/logout", {
    controller: "auth/login",
    action: "logout",
    name: "auth_logout"
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

  AboutView.prototype.template = require("./aboutView_");

  AboutView.prototype.getTemplateData = function() {};

  return AboutView;

})(View);
});

;require.register("views/about/aboutView_", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};

buf.push("<div class=\"row landing text-center\"><div class=\"col-md-12\"><h1>#steviewhale</h1><p>Моментальная печать фотографий из Instagram</p><img src=\"/images/stevie-kid.svg\" class=\"img-responsive\"/><h2>Привет, друг! </h2><div class=\"row\"><div class=\"col-md-6 col-md-offset-3\">\t\t\t\t<p class=\"lead\">Меня зовут Стиви! Я большой фиолетовый кит.</p></div></div></div></div><div class=\"row how-it-works text-center\"><div class=\"col-md-12\"><div class=\"container\"><h1>Как это работает?</h1><div class=\"row\"><div class=\"col-md-4\"><div class=\"super-icon glyphicon glyphicon-camera\"></div><h3>Публикуйте</h3><p>Опубликуйте фотографию в Instagram\nс хештегом #steviewhale</p></div><div class=\"col-md-4\"><div class=\"super-icon glyphicon glyphicon-print\"></div><h3>Печатайте</h3><p>Фотография сразу же напечатается на одной\nиз печатных станций, которые предоставляются\nдобряками.</p></div><div class=\"col-md-4\"><div class=\"super-icon glyphicon glyphicon-heart\"></div><h3>Забирайте</h3><p>Заберите фотографию с печатной станции. Не забудьте поблагодарить\nвладельца! Можно сказать \"спасибо\", спеть песенку, а можно просто душевно\nобнять этого благородного человека!  </p></div></div></div></div></div>");;return buf.join("");
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

  LoginView.prototype.template = require("./loginView_");

  LoginView.prototype.getTemplateData = function() {};

  return LoginView;

})(View);
});

;require.register("views/auth/loginView_", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};

buf.push("<form role=\"form\" class=\"text-center login-form\"><h2>Вумпс! Авторизуйтесь</h2><div class=\"logo-container\"><img src=\"/images/stevie-kid.svg\" class=\"img-responsive\"/></div><div class=\"form-group form-group-lg\"><input type=\"text\" placeholder=\"Логин\" class=\"login-field form-control\"/><input type=\"password\" placeholder=\"Пароль\" class=\"password-field form-control\"/></div><div class=\"login-button btn btn-lg btn-primary btn-block\">Войти</div></form>");;return buf.join("");
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
var Storage, View, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

jade.url = Chaplin.utils.reverse;

jade.markdown = (function() {
  var converter,
    _this = this;
  converter = new Showdown.converter();
  return function(text) {
    if (text != null) {
      return converter.makeHtml(text);
    }
  };
})();

Storage = require("storage");

jade.auth = function() {
  return Storage.user != null;
};

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

;require.register("views/base/collectionView", function(exports, require, module) {
var CollectionView, View, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

View = require('./base');

module.exports = CollectionView = (function(_super) {
  __extends(CollectionView, _super);

  function CollectionView() {
    _ref = CollectionView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  CollectionView.prototype.getTemplateFunction = View.prototype.getTemplateFunction;

  return CollectionView;

})(Chaplin.CollectionView);
});

;require.register("views/shot/grid/item/shotGridItemView", function(exports, require, module) {
var Shot, ShotGridItemView, Storage, View, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

View = require("views/base/base");

Storage = require("storage");

Shot = require("models/shot");

module.exports = ShotGridItemView = (function(_super) {
  __extends(ShotGridItemView, _super);

  function ShotGridItemView() {
    _ref = ShotGridItemView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  ShotGridItemView.prototype.className = "shot-grid-item";

  ShotGridItemView.prototype.initialize = function() {
    ShotGridItemView.__super__.initialize.apply(this, arguments);
    this.delegate("click", ".delete-confirm", this.deleteHandler);
    return this.delegate("click", ".print-button", this.printHandler);
  };

  ShotGridItemView.prototype.deleteHandler = function() {
    return this.model.destroy({
      wait: true
    });
  };

  ShotGridItemView.prototype.printHandler = function() {
    return this.model.print();
  };

  ShotGridItemView.prototype.template = require("./shotGridItemView_");

  ShotGridItemView.prototype.getTemplateData = function() {
    return {
      shot: this.model.attributes
    };
  };

  return ShotGridItemView;

})(View);
});

;require.register("views/shot/grid/item/shotGridItemView_", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),shot = locals_.shot;
buf.push("<div class=\"polaroid\"><div" + (jade.attr("style", "background-image:url(" + (shot.thumbnail) + ")", true, false)) + " class=\"polaroid-photo\"></div><span class=\"glyphicon glyphicon-map-marker\"></span>");
switch (shot.status){
case "failed":
buf.push("<span>Ошибка</span>");
  break;
case "printed":
buf.push("<span>Напечатана</span>");
  break;
case "queued":
buf.push("<span>В очереди</span>");
  break;
default:
buf.push("<span>Необработана</span>");
  break;
}
if ( jade.auth())
{
buf.push("<div class=\"btn-group\">");
if ( shot.status != "printed")
{
buf.push("<a class=\"print-button btn btn-default btn-sm\"><span class=\"glyphicon glyphicon-print\"></span></a>");
}
buf.push("<a class=\"delete-confirm btn btn-default btn-sm\"><span class=\"glyphicon glyphicon-remove\"></span></a></div>");
}
buf.push("</div>");;return buf.join("");
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

;require.register("views/shot/grid/shotGridView", function(exports, require, module) {
var CollectionView, ShotGridItemView, ShotGridView, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

ShotGridItemView = require("./item/shotGridItemView");

CollectionView = require("views/base/collectionView");

module.exports = ShotGridView = (function(_super) {
  __extends(ShotGridView, _super);

  function ShotGridView() {
    _ref = ShotGridView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  ShotGridView.prototype.initialize = function() {
    var _this = this;
    ShotGridView.__super__.initialize.apply(this, arguments);
    return this.delegate("click", ".load-button", function() {
      return _this.collection.forceLoad();
    });
  };

  ShotGridView.prototype.className = "shot-grid-view";

  ShotGridView.prototype.listSelector = ".shot-grid";

  ShotGridView.prototype.itemView = ShotGridItemView;

  ShotGridView.prototype.template = require("./shotGridView_");

  return ShotGridView;

})(CollectionView);
});

;require.register("views/shot/grid/shotGridView_", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};

buf.push("<div class=\"container\"><h1>Фотографии</h1>");
if ( jade.auth())
{
buf.push("<button class=\"load-button btn btn-success\">Подгрузить</button>");
}
buf.push("<div class=\"row\"><div class=\"col-md-12\"><div class=\"shot-grid\"></div></div></div></div>");;return buf.join("");
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

;require.register("views/shot/show/shotView", function(exports, require, module) {
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

  ShotView.prototype.template = require("./shotView_");

  ShotView.prototype.getTemplateData = function() {
    return {
      shot: this.model
    };
  };

  return ShotView;

})(View);
});

;require.register("views/shot/show/shotView_", function(exports, require, module) {
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

  SiteView.prototype.template = require('./siteView_');

  return SiteView;

})(View);
});

;require.register("views/site/siteView_", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};

buf.push("<nav role=\"navigation\" class=\"navbar navbar-inverse navbar-static-top\"><div class=\"container\"><ul class=\"nav navbar-nav\"><li><a" + (jade.attr("href", jade.url("static#about"), true, false)) + "> О Проекте</a></li><li><a" + (jade.attr("href", "" + (jade.url('stations#index')) + "", true, false)) + "> Печатные Станции</a></li><li><a" + (jade.attr("href", "" + (jade.url('shots#index')) + "", true, false)) + "> Фотографии</a></li></ul><ul class=\"nav navbar-nav navbar-right\">");
if ( !jade.auth())
{
buf.push("<li><a" + (jade.attr("href", "" + (jade.url('auth_login')) + "", true, false)) + "> Войти</a></li>");
}
else
{
buf.push("<li><a" + (jade.attr("href", "" + (jade.url('auth_logout')) + "", true, false)) + "> Выйти</a></li>");
}
buf.push("</ul></div></nav><div class=\"container-fluid site-container\"><div id=\"main-container\"></div></div>");;return buf.join("");
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

;require.register("views/station/create/stationCreateView", function(exports, require, module) {
var Station, StationCollection, StationCreateView, View, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

View = require("views/base/base");

Station = require("models/station");

StationCollection = require("collections/stationCollection");

module.exports = StationCreateView = (function(_super) {
  __extends(StationCreateView, _super);

  function StationCreateView() {
    _ref = StationCreateView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  StationCreateView.prototype.initialize = function() {
    return this.delegate("click", ".register-button", this.register);
  };

  StationCreateView.prototype.register = function() {
    var fields, station;
    fields = {
      title: this.$(".title-input").val(),
      subtitle: this.$(".subtitle-input").val()
    };
    station = new Station(fields);
    return station.save(null, {
      success: function() {
        return Chaplin.utils.redirectTo("stations#index");
      }
    });
  };

  StationCreateView.prototype.template = require("./stationCreateView_");

  StationCreateView.prototype.getTemplateData = function() {};

  return StationCreateView;

})(View);
});

;require.register("views/station/create/stationCreateView_", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};

buf.push("<div class=\"container\"><h1>Регистрация станции</h1><div role=\"form\" class=\"form\"><div class=\"form-group\"><input type=\"text\" placeholder=\"Название\" class=\"title-input form-control\"/></div><div class=\"form-group\"><input type=\"text\" placeholder=\"Подзаголовок\" class=\"subtitle-input form-control\"/></div><div class=\"row\"><div class=\"col-md-4 col-md-offset-4\"><div class=\"register-button btn btn-primary btn-lg btn-block save-button\">Зарегистрировать</div></div></div></div></div>");;return buf.join("");
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

  StationEditView.prototype.template = require("./stationEditView_");

  StationEditView.prototype.initialize = function() {
    return this.delegate('click', '.save-button', this.save);
  };

  StationEditView.prototype.save = function() {
    var fields,
      _this = this;
    fields = {
      name: this.$(".name-input").val(),
      title: this.$(".title-input").val(),
      subtitle: this.$(".subtitle-input").val(),
      description: this.$(".desc-input").val()
    };
    console.log(fields);
    return this.model.save(fields, {
      success: function() {
        console.log(_this.model);
        return Chaplin.utils.redirectTo("stations#show", {
          name: _this.model.attributes.name
        });
      }
    });
  };

  StationEditView.prototype.getTemplateData = function() {
    return {
      station: this.model.attributes
    };
  };

  return StationEditView;

})(View);
});

;require.register("views/station/edit/stationEditView_", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),station = locals_.station;
buf.push("<div class=\"container\"><h1>Редактировать станцию</h1><div role=\"form\" class=\"form\"><div class=\"form-group\"><label>Краткий адрес (URL)</label><input type=\"text\"" + (jade.attr("value", station.name, true, false)) + " class=\"name-input form-control\"/></div><div class=\"form-group\"><label>Название</label><input type=\"text\"" + (jade.attr("value", station.title, true, false)) + " class=\"title-input form-control\"/></div><div class=\"form-group\"><label>Подзаголовок</label><input type=\"text\"" + (jade.attr("value", station.subtitle, true, false)) + " class=\"subtitle-input form-control\"/></div><div class=\"form-group\"><label>Описание <small>(Поддерживает Markdown)</small></label><textarea rows=\"12\"" + (jade.attr("text", station.description, true, false)) + " class=\"desc-input form-control\">" + (jade.escape(null == (jade.interp = station.description) ? "" : jade.interp)) + "</textarea></div><div class=\"row\"><div class=\"col-md-4 col-md-offset-4\"><div class=\"login-button btn btn-primary btn-lg btn-block save-button\">Сохранить</div></div></div></div></div>");;return buf.join("");
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
var StationListItemView, Storage, View, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

View = require("views/base/base");

Storage = require("storage");

module.exports = StationListItemView = (function(_super) {
  __extends(StationListItemView, _super);

  function StationListItemView() {
    _ref = StationListItemView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  StationListItemView.prototype.template = require("./stationListItemView_");

  StationListItemView.prototype.getTemplateData = function() {
    return {
      station: this.model.attributes
    };
  };

  return StationListItemView;

})(View);
});

;require.register("views/station/list/stationListItemView_", function(exports, require, module) {
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
buf.push("</h3><p class=\"lead\">" + (jade.escape(null == (jade.interp = station.subtitle) ? "" : jade.interp)) + "</p></div>");;return buf.join("");
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

  StationListView.prototype.animationDuration = 300;

  StationListView.prototype.itemView = StationListItemView;

  StationListView.prototype.listSelector = ".station-list";

  StationListView.prototype.loadingSelector = ".loading-container";

  StationListView.prototype.template = require("./stationListView_");

  StationListView.prototype.getTemplateData = function() {};

  StationListView.prototype.getTemplateFunction = function() {
    return this.template;
  };

  return StationListView;

})(Chaplin.CollectionView);
});

;require.register("views/station/list/stationListView_", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};

buf.push("<div class=\"container\"><h1>Печатные Станции</h1><div class=\"row\"><div class=\"col-md-12\">");
if ( jade.auth())
{
buf.push("<a" + (jade.attr("href", jade.url("station_create"), true, false)) + " class=\"btn btn-success\">Зарегистрировать</a>");
}
buf.push("<div class=\"loading-container\"><h2>Загрузка</h2></div><div class=\"station-list\"></div></div></div></div>");;return buf.join("");
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

;require.register("views/station/show/stationView", function(exports, require, module) {
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

  StationView.prototype.initialize = function() {
    return this.delegate("click", ".delete-confirm-button", this.deleteStation);
  };

  StationView.prototype.deleteStation = function() {
    var _this = this;
    this.$(".delete-modal").modal("hide");
    return this.model.destroy({
      success: function() {
        return Chaplin.utils.redirectTo("stations#index");
      }
    });
  };

  StationView.prototype.template = require("./stationView_");

  StationView.prototype.getTemplateData = function() {
    return {
      station: this.model.attributes
    };
  };

  return StationView;

})(View);
});

;require.register("views/station/show/stationView_", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),station = locals_.station;
buf.push("<div class=\"container\"><div class=\"station-item\"><h1>" + (jade.escape(null == (jade.interp = station.title ) ? "" : jade.interp)) + " ");
switch (station.online){
case true :
buf.push("<span class=\"label label-success\">Онлайн</span>");
  break;
default:
buf.push("<span class=\"label label-warning\">Оффлайн</span>");
  break;
}
buf.push("</h1><h2>");
if ( jade.auth())
{
buf.push("<div class=\"btn-group btn-group-sm\"><button type=\"button\" data-toggle=\"dropdown\" class=\"btn btn-default dropdown-toggle\"><span class=\"glyphicon glyphicon-cog\"></span> <span class=\"caret\"></span></button><ul role=\"menu\" class=\"dropdown-menu\"><li><a" + (jade.attr("href", jade.url('station_edit', {name : station.name}), true, false)) + " class=\"edit-button\"><span class=\"glyphicon glyphicon-pencil\"></span> Редактировать</a></li><li><a href=\"#\" data-toggle=\"modal\" data-target=\".delete-modal\" class=\"delete-button\"><span class=\"glyphicon glyphicon-remove\"></span> Удалить</a></li></ul></div>");
}
buf.push(" <small>" + (jade.escape(null == (jade.interp = station.subtitle) ? "" : jade.interp)) + "</small></h2><p class=\"lead\">" + (null == (jade.interp = jade.markdown(station.description)) ? "" : jade.interp) + "</p></div><div tabindex=\"-1\" role=\"dialog\" aria-labelledby=\"mySmallModalLabel\" aria-hidden=\"true\" class=\"modal delete-modal\"><div class=\"modal-dialog modal-sm\"><div class=\"modal-content\"><div class=\"modal-header\"><h4 class=\"modal-title\">Удалить станцию?</h4></div><div class=\"modal-body\">Внимательно подумайте перед удалением станции, возможно, она вам \nеще пригодится!\t</div><div class=\"modal-footer text-center\"><button class=\"delete-confirm-button btn btn-primary\">Да!</button><button data-dismiss=\"modal\" class=\"btn btn-default\">Нет, я передумал.</button></div></div></div></div></div>");;return buf.join("");
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