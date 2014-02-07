Station = require "../../models/station"

allowedFields = [ 
	"_id" 
	"name" 
	"title" 
	"description" 
	"instructions" 
	"created" 
]

###
# Get all stations
###
exports.index = (req, res, next) ->
	Station.find({})
	.select( allowedFields.join " " )
	.exec (err, items) ->
		if err 
			return next err

		res.json items

###
# Get station with specified name 
###
exports.show = (req, res, next) ->
	Station.findOne({ name : req.params.name })
	.select( allowedFields.join " " )
	.exec (err, item) ->
		if err 
			return next err

		if not item?
			return next new Error "Station not found"

		res.json item 

###
# Create new print station
###
exports.create = (req, res, next) ->
	return next new Error "Not implemented!"

###
# Update existing station
###
exports.update = (req, res, next) ->
	return next new Error "Not implemented!"	

###
# Delete existing station
###
exports.delete = (req, res, next) ->
	return next new Error "Not implemented!"
	