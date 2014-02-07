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
# Get all shots
###
exports.login = (req, res, next) ->
	res.json
		user : req.user

###
# Get specified shot 
###
exports.logout = (req, res, next) ->
	req.logout()
	res.json {}
 
