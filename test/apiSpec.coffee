mongoose = require "mongoose"
config   = require "../server/utils/config"
app      = (require "../server/services/http").app


describe "application API", ->
  @timeout 10000

  before (done) ->
    mongoose.connect config.get("db:mongo"), (err) ->
      throw err if err
      do done

  (require "./api/shotSpec") app

