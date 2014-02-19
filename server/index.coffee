mongoose = require "mongoose"

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


