Station = require "../models/station"

allowedFields = [ "_id", "name", "title", "description", "instructions", "created" ]

module.exports =

	index : (req, res, next) ->
		Station.find({})
		.select( allowedFields.join " " )
		.exec (err, items) ->
			if err 
				return next err

			res.json items


	show : (req, res, next) ->
		Station.findOne({ name : req.params.name })
		.select( allowedFields.join " " )
		.exec (err, item) ->
			if err 
				return next err

			if not item?
				return next new Error "Station not found"

			res.json item 

	create : (req, res, next) ->
		return next new Error "Not implemented!"

	update : (req, res, next) ->
		return next new Error "Not implemented!"	

	delete : (req, res, next) ->
		return next new Error "Not implemented!"