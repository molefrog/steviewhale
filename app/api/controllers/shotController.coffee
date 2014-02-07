Shot = require "../../models/shot"

###
# Get all shots
###
exports.index = (req, res, next) ->
	Shot.find({})
	.exec (err, items) ->
		if err 
			return next err

		res.json items

###
# Get specified shot 
###
exports.show = (req, res, next) ->
	Shot.findById( req.params.id )
	.exec (err, item) ->
		if err 
			return next err

		if not item?
			return next new Error "Shot not found"

		res.json item

###
# Delete existing shot
###
exports.delete = (req, res, next) ->
	Shot.remove({ _id : req.params.id })
	.exec (err) ->
		if err 
			return next err

		res.json {}

