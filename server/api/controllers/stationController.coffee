Station = require "../../models/station"
_       = require "lodash"
uid     = require "uid"

allowedReadFields = [ 
	"_id" 
	"name" 
	"title"
	"subtitle" 
	"description" 
	"instructions" 
	"created" 
	"online"
]

# Fields that are allowed for modification
allowedWriteFields = [
	"name"
	"title"
	"subtitle"
	"description"
	"instructions"
]

###
# Get all stations
###
exports.index = (req, res, next) ->
	Station.find({})
	.select( allowedReadFields.join " " )
	.exec (err, items) ->
		if err 
			return next err

		res.json items

###
# Get station with specified name 
###
exports.show = (req, res, next) ->
	Station.findOne({ name : req.params.name })
	.select( allowedReadFields.join " " )
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
	# Filter fields 
	fields = _.pick req.body, allowedWriteFields

	# Generate random secret key for this station
	fields.secret = uid 6

	Station.create fields, (err, station) ->
		if err
			return next new Error "Database error #{err}"

		return res.json station

###
# Update existing station
###
exports.update = (req, res, next) ->
	# Filter fields 
	fields = _.pick req.body, allowedWriteFields

	
	Station.update {name : req.params.name}, {$set: fields}, {}, (err, station) ->
		if err
			return next err

		return res.json station

###
# Delete existing station
###
exports.delete = (req, res, next) ->
	Station.remove name : req.params.name, (err) ->
		if err
			return next new Error "Database error #{err}"
		return res.json {}


