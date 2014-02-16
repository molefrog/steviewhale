express    = require "express"
multiparty = require "connect-multiparty"
passport   = require "passport"
url        = require "url"
RedisStore = (require "connect-redis") (express)

config      = require "./utils/config"
log         = require "./utils/log"
redis       = require "./utils/redis"

User = require "./models/user"

app = do express


app.configure "all", ->
	app.use express.cookieParser()	
	app.use multiparty()
	app.use express.json()
	app.use express.urlencoded()

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
	app.use express.static "#{__dirname}/../public"

	app.use app.router
	app.get "*", (req, res) ->
		res.sendfile "./public/index.html"
	
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
do (require "./services/watcher")
(require "./services/queue/server")
(require "./services/pool/server") io


