express    = require "express"
multiparty = require "connect-multiparty"

config = require "./app/utils/config"
log    = require "./app/utils/log"

app = do express

app.set "views", "#{__dirname}/app/views"
app.set "view engine", "jade"

app.configure "all", ->
	app.use multiparty()
	app.use express.json()
	app.use express.urlencoded()
	app.use "/api", require "./app/api"
	app.use app.router
	app.use express.static "#{__dirname}/public"
	app.use express.errorHandler()

	(require "./app/routes")(app)

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
app.listen config.get("port"), (err) ->
	if err
		log.error "Web server error #{err}"
	else
		log.info "Web server started on port #{config.get('port')}"


