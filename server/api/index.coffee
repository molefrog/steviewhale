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
app.param  "station",                   StationController.stationParam
app.get    "/stations",                 StationController.index
app.get    "/stations/:station",        StationController.show 
app.delete "/stations/:station",        Authenticated, StationController.delete
app.post   "/stations",                 Authenticated, StationController.create
app.put    "/stations/:station",        Authenticated, StationController.update
app.post   "/stations/:station/rename", Authenticated, StationController.rename
app.get    "/stations/:station/secret", Authenticated, StationController.secret

app.get    "/shots",          ShotController.index
app.get    "/shots/load",     Authenticated, ShotController.load
app.get    "/shots/:id",    ShotController.show
app.delete "/shots/:id",      Authenticated, ShotController.delete
app.get    "/shots/:id/queue",Authenticated, ShotController.queue


app.post  "/auth/login",    passport.authenticate("local"), AuthController.login
app.post  "/auth/logout",   Authenticated, AuthController.logout 
app.get   "/auth",          AuthController.index

