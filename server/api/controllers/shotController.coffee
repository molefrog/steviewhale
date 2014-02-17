queue = require "../../services/queue/server"
Shot = require "../../models/shot"

log = require "../../utils/log"

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

exports.queue = (req, res, next) ->
	Shot.findById( req.params.id )
	.exec (err, item) ->
		if err 
			return next err

		if not item?
			return next new Error "Shot not found"

		if item.status == "queued" 
			return next new Error "Already in the queue"

		if item.status == "printed"
			return next new Error "Already printed"

		item.status = "queued"
		item.save (err, item) ->
			job = queue.create "print", 
				id : item._id
			.save()
			
			job.on "failed", ->
				item.status = "failed"
				item.save ->

			job.on "complete", ->
				item.status = "printed"
				item.save ->

			res.json {}


