View = require "views/base/base"

Storage = require "storage"

module.exports = class LoginView extends View
  initialize : ->
    @delegate "submit", ".login-form", @login

  loginSuccess : (user) ->
    Storage.user = user
    if Storage.redirectUrl?
      Chaplin.utils.redirectTo 
        url : Storage.redirectUrl 
    else
      Chaplin.utils.redirectTo "static#about"

  login : (evt) ->
    evt.preventDefault()

    data = 
      username : @$(".login-field").val()
      password : @$(".password-field").val()

    $.post('/api/auth/login', data)
    .done (data) =>
      @loginSuccess data.user
    .fail =>
      @$(".login-form").addClass("animated shake")
      @$(".login-form input").prop("disabled", true)
      setTimeout =>
        @$(".login-form").removeClass("animated shake")
        @$(".login-form input").prop("disabled", false)
      , 1000
     

  template : require "./loginView_"

  getTemplateData : -> 
