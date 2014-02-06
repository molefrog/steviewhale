Instagram 	= require "instagram-node-lib"
express 	= require "express"
log 		= require "./app/log"

##
# Config file
##
config   = require "nconf"
config.argv()
	.env()

config.defaults 
	"config-file" : "config.json"

config.file({ file: config.get "config-file" })


##
# Setting up instagram client
##
Instagram.set "client_id", 		config.get "instagram:id"
Instagram.set "client_secret", 	config.get "instagram:secret"
Instagram.set "redirect_uri",	config.get "instagram:redirect_uri"

watcher = require "./app/watcher"
watcher config.get "hashtag"


##
# Web-server routes
##
app = express()

port = 3030
app.listen port, (err) ->
	if err
		log.error "Web server error #{err}"
		process.exit 0

	log.info "Web server started on port #{port}"

app.get "/", (req, res) ->
	url = Instagram.oauth.authorization_url
		scope: 'comments likes'
		display: 'touch'

	res.redirect url

app.get "/oauth", (req, res) ->
	Instagram.oauth.ask_for_access_token
		request : req 
		response : res 
		
		complete: (params, response) ->
			Instagram.set "access_token", params["access_token"]

			response.send 200

		error: (errorMessage, errorObject, caller, response) ->
			response.send 406

