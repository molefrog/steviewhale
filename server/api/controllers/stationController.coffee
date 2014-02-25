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
	"streaming"
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
# Param handler
###
exports.stationParam = (req, res, next, name) ->
	Station.findOne( { name : name } )
	.exec (err, station) ->
		return next err if err

		if not station?
			return next new Error "Station not found"

		req.station = station
		do next

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
	res.json _.pick req.station, allowedReadFields

###
# Create new print station
###
exports.create = (req, res, next) ->
	# Filter fields 
	fields = _.pick req.body, allowedWriteFields

	# Generate random secret key for this station
	fields.secret = uid 6

	if not fields.name?
		fields.name = uid 10

	Station.create fields, (err, station) ->
		if err
			return next new Error "Database error #{err}"

		return res.json station

###
# Update existing station
###
exports.update = (req, res, next) ->
	fields = _.pick req.body, allowedWriteFields

	Station.update { name : req.station.name }, fields, (err) ->
		res.json {}


###
# Delete existing station
###
exports.delete = (req, res, next) ->
	Station.remove name : req.station.name, (err) ->
		if err
			return next new Error "Database error #{err}"
		return res.json {}

###
# Get station's secret key
###
exports.secret = (req, res, next) ->
	res.json _.pick req.station, "secret"

###
# Rename station (change URL)
###
exports.rename = (req, res, next) ->
	Station.update { name : req.station.name }, { name : req.body.name }, (err) ->
		if err 
			return next err

		res.json {}




