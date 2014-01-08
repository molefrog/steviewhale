Instagram 	= require "instagram-node-lib"
express 	= require "express"

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

watcher = require "./watcher"
watcher config.get "hashtag"


##
# Web-server routes
##
app = express()

app.listen 3030, (err) ->
	console.log "Server started"

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

