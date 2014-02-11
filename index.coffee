express    = require "express"
multiparty = require "connect-multiparty"
passport   = require "passport"
url        = require "url"
RedisStore = (require "connect-redis") (express)

config      = require "./app/utils/config"
log         = require "./app/utils/log"
redis       = require "./app/utils/redis"

User = require "./app/models/user"

app = do express

app.set "views", "#{__dirname}/app/views"
app.set "view engine", "jade"


app.configure "all", ->
	app.use express.cookieParser()	
	app.use multiparty()
	app.use express.json()
	app.use express.urlencoded()

	redisSession = redis config.get "db:redis:session"
	redisSession.on "error", (err) ->
		log.error "Redis Session error #{err}"

	redisSession.on "ready", ->
		log.info "Redis Session connected"

	app.use express.session
		secret : config.get "web:cookieSecret"
		store  : new RedisStore
			client : redisSession

	app.use passport.initialize()
	app.use passport.session()

	app.use "/api", require "./app/api"
	app.use app.router
	app.use express.static "#{__dirname}/public"
	app.use express.errorHandler()
	
server = (require "http").createServer app 
io = (require "socket.io").listen server

io.set "log level", 0

###
# Application startup
# TODO: Make this calls to execute in series (using deferred) at startup
###

# Connect to MongoDB
mongoose = require "mongoose"
mongoose.connect config.get("db:mongo"), (err) ->
	if err
		log.error "MongoDB connection error #{err}"

# Start express http server
server.listen config.get("web:port"), (err) ->
	if err
		log.error "Web server error #{err}"
	else
		log.info "Web server started on port #{config.get('web:port')}"
##
# Services
##

# Start instagram watcher
do (require "./app/services/watcher")
(require "./app/services/pool") io


