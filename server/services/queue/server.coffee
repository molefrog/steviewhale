kue    = require "kue"
_      = require "lodash"

config = require "../../utils/config"
log    = require "../../utils/log"
pool   = require "../pool/clients"

Shot   = require "../../models/shot"

module.exports = jobs = kue.createQueue()

jobs.process "print", (job, done) ->
	job.log "Job started. Shot ##{job.data.id}"

	if _.isEmpty pool
		job.log "The pool is empty"
		return done "No available agents!"

	idx = _.sample _.keys pool
	agent = pool[ idx ]
	
	Shot.findById( job.data.id )
	.exec (err, item) ->
		if err
			return done "Database error"

		if not item?
			return done "Wrong element"

		agent.emit "print", item.image, (err) ->
			done err
