Shot = require "./models/shot"

module.exports = (app) ->

	app.get "/", (req, res) ->
		res.render "index",
			session : JSON.stringify req.user

	app.get "/login", (req, res) ->
		res.render "login"
