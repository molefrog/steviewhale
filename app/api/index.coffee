passport = require "passport"
module.exports = app = do require "express"

StationController = require "./controllers/stationController"
ShotController    = require "./controllers/shotController"
AuthController    = require "./controllers/authController"

##
# RESTful CRUD handlers
## 
app.get    "/stations",       StationController.index
app.get    "/stations/:name", StationController.show 
app.delete "/stations/:name", StationController.delete
app.post   "/stations",       StationController.create
app.put    "/stations/:name", StationController.update

app.get    "/shots",          ShotController.index
app.get    "/shots/:id", 	  ShotController.show
app.delete "/shots/:id",      ShotController.delete

app.post 	"/auth/login", 	  passport.authenticate("local"), AuthController.login
app.post 	"/auth/logout",   AuthController.logout 
