passport = require "passport"
LocalStrategy = (require "passport-local").Strategy

User = require "../../models/user"

passport.use new LocalStrategy (login, password, done) ->
  User.authenticate login, password, done

passport.serializeUser (user, done) ->
  done null, user._id

passport.deserializeUser (id, done) ->
  User.findById id, done

###
# Login function
###
exports.login = (req, res, next) ->
  res.json
    user : req.user

###
# Logout function 
###
exports.logout = (req, res, next) ->
  req.logout()
  res.json {}
 
###
# Get authentication status
###
exports.index = (req, res, next) ->
  if req.user?
    res.send 
      auth : true
      user : req.user
  else
    res.send 
      auth : false  
