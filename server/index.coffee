mongoose = require "mongoose"
_ = require "lodash"

# Utilities
{ config, log } = require "./utils"

# Loading services
require "./services"

# Connecting to MongoDB
MongoDB = mongoose.connect config.get("db:mongo"), (err) ->
  if err
    log.error "MongoDB connection error #{err}"

MongoDB.connection.on "error", (err) ->
  log.error "MongoDB connection error #{err}"

##
# Pre init routines
##
{ Shot, Station } = require "./models"

Shot.update { status: "queued" }, { status : "failed" }, { multi: true }, (err, numberAffected) ->
  log.info "Marked #{numberAffected} queued shots as failed"

# Catch unhandled exceptions
process.on "uncaughtException", (err) ->
  log.error "Fatal error #{err.stack}"
