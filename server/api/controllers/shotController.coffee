queue  = require "../../services/queue"
Shot   = require "../../models/shot"

watcher = require "../../services/watcher"

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

##
# TODO: move enque method to a separate module
##
exports.queue = (req, res, next) ->
	Shot.findById( req.params.id )
	.exec (err, item) ->
		item.queue ->
			res.json {}

###
# Force load existing items from Instagram
###
exports.load = (req, res, next) ->
	watcher.forceLoad (err) ->
		return next err if err

		res.json {}


