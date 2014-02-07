mongoose     = require "mongoose"
passwordHash = require "password-hash"

Schema   = mongoose.Schema

UserSchema = new Schema
  login : 
    type : String
    unique : true

  hash: 
    type: String
    required: true


UserSchema.method "checkPassword", (password) ->
  passwordHash.verify password, this.hash

UserSchema.virtual("password").set (password) ->
  this.hash = passwordHash.generate password

UserSchema.static "authenticate", (login, password, done) ->
    this.findOne { login }, (err, user) ->
      if err
        return done err

      if not user?
        return done null, false

      if not user.checkPassword password
        return done null, false
      
      return done null, user

module.exports = mongoose.model "User", UserSchema