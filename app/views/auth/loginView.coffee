View = require "views/base/base"

Storage = require "storage"

module.exports = class LoginView extends View
	initialize : ->
		@delegate "click", ".login-button", @login

	loginSuccess : (user) ->
		Storage.user = user
		if Storage.redirectUrl?
			Chaplin.utils.redirectTo 
				url : Storage.redirectUrl 
		else
			Chaplin.utils.redirectTo "static#about"

	login : -> 
		data = 
			username : @$(".login-field").val()
			password : @$(".password-field").val()

		$.post('/api/auth/login', data)
		.done (data) =>
			@loginSuccess data.user
		.fail =>
			alert "fail"

	template : require "./loginViewTemplate"

	getTemplateData : -> 