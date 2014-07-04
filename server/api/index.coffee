passport = require "passport"
express  = require "express"
module.exports = router = do express.Router

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
router.param  "station",                   StationController.stationParam
router.get    "/stations",                 StationController.index
router.get    "/stations/:station",        StationController.show
router.delete "/stations/:station",        Authenticated, StationController.delete
router.post   "/stations",                 Authenticated, StationController.create
router.put    "/stations/:station",        Authenticated, StationController.update
router.get    "/stations/:station/secret", Authenticated, StationController.secret

router.get    "/shots",          ShotController.index
router.get    "/shots/:id",      ShotController.show
router.delete "/shots/:id",      Authenticated, ShotController.delete
router.get    "/shots/:id/queue",Authenticated, ShotController.queue

router.post  "/auth/login",    passport.authenticate("local"), AuthController.login
router.post  "/auth/logout",   Authenticated, AuthController.logout
router.get   "/auth",          AuthController.index


