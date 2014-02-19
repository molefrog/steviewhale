express    = require "express"
multiparty = require "connect-multiparty"
passport   = require "passport"
url        = require "url"
socketio   = require "socket.io"

# Utilities
{ config, log } = require "./utils"

# Application models
{ User } = require "./models"

app = do express

app.configure "all", ->
	app.use express.cookieParser()	
	app.use multiparty()
	app.use express.json()
	app.use express.urlencoded()

	###
	# Use code if you want session data to be shared 
	# across server instances  
	###
	# RedisStore = (require "connect-redis") (express)
	# redisSession = redis config.get "db:redis:session"
	# redisSession.on "error", (err) ->
	# 	log.error "Redis Session error #{err}"

	app.use express.session
		secret : config.get "web:cookieSecret"
		# store  : new RedisStore
		# 	client : redisSession

	app.use passport.initialize()
	app.use passport.session()

	app.use "/api", require "./api"
	app.use "/queue", (require "kue").app
	app.use "/streaming", require "./services/streaming"
	
	app.use express.static "#{__dirname}/../public"

	app.use app.router
	app.get "*", (req, res) ->
		res.sendfile "./public/index.html"
	
	app.use express.errorHandler()


###
# Application startup
# TODO: Make this calls to execute in series (using deferred) at startup
###
services = require "./services"
services.http.app.use app

# Connect to MongoDB
mongoose = require "mongoose"
MongoDB = mongoose.connect config.get("db:mongo"), (err) ->
	if err
		log.error "MongoDB connection error #{err}"

MongoDB.connection.on "error", (err) ->
	log.error "MongoDB connection error #{err}"


