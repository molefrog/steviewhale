passport = require "passport"
module.exports = app = do require "express"

##
# Controllers
##
StationController = require "./controllers/stationController"
ShotController    = require "./controllers/shotController"
AuthController    = require "./controllers/authController"

##
# Access Policies
##
Authenticated = require "./policies/authenticated"

##
# RESTful CRUD handlers
## 
app.get    "/stations",       StationController.index
app.get    "/stations/:name", StationController.show 
app.delete "/stations/:name", Authenticated, StationController.delete
app.post   "/stations",       Authenticated, StationController.create
app.put    "/stations/:name", Authenticated, StationController.update

app.get    "/shots",          ShotController.index
app.get    "/shots/:id", 	  ShotController.show
app.delete "/shots/:id",      Authenticated, ShotController.delete

app.post 	"/auth/login", 	  passport.authenticate("local"), AuthController.login
app.post 	"/auth/logout",   Authenticated, AuthController.logout 
app.get 	"/auth",          AuthController.index

