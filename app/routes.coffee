Shot = require "./models/shot"

module.exports = (app) ->

	app.get "/", (req, res) ->
		res.render "index",
			token : "JSON.stringify req.session"

	app.get "/login", (req, res) ->
		res.render "login"
