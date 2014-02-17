kue    = require "kue"
_      = require "lodash"

pool   = require "../pool/clients"

{ config, log } = require "../../utils"
{ Shot }        = require "../../models"

module.exports = jobs = kue.createQueue()

###
# Job processing function
###
jobs.process "print", (job, done) ->
	job.log "Job started. Shot ##{job.data.id}"

	# Check if the station pool is empty
	if _.isEmpty pool
		job.log "The pool is empty"
		return done "No available agents!"

	# Take random station
	idx = _.sample _.keys pool
	agent = pool[ idx ]
	
	# Take shot instance from database
	Shot.findById( job.data.id )
	.exec (err, item) ->
		if err
			return done "Database error"

		if not item?
			return done "Wrong element"

		# Call 'print' function
		agent.emit "print", item.image, done
