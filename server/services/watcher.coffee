Instagram 	= require "instagram-node-lib"
_  			= require "lodash"
async       = require "async"

# Util objects
log         = require "../utils/log"
config		= require "../utils/config"

# Local models
Shot = require "../models/shot"


module.exports = ->

	Instagram.set "client_id", 		config.get "instagram:id"
	Instagram.set "client_secret", 	config.get "instagram:secret"

	hashtag       = config.get "instagram:hashtag"
	processed     = []
	checkInterval = config.get "instagram:interval"

	##
	# This function processes one instagram item 
	## 
	processItem = (data, cb) ->
		if data.type != "image"
			return cb null

		log.info "#{data.user.username} posted image at #{data.link}"

		# TODO: save image and thumbnail to Amazon S3
		# Instagram item can be deleted!

		shot = new Shot
			hash      : data.id
			image     : data.images.standard_resolution.url
			thumbnail : data.images.thumbnail.url
			instagram : data

		shot.save (err, item) ->
			log.info "Saved new shot to db ##{item._id}"

			if err 
				log.error "Error saving new shot item #{err}" 

			# The default behaviour of async.each is to stop the whole process when 
			# even just one item has failed.
			# We prevent this situation by ignoring 'save' error handling 

			return cb null

	##
	# This function is used to check whether a new portion of media is 
	# available on Instagram
	##
	checkInstagram = ->
		Instagram.tags.recent
			name: hashtag,
			complete : (data) ->
				portion = _.filter data, (d) ->
					not _.contains processed, d.id

				async.each portion, processItem, (err) ->
					
					# Mark this portion as processed
					_.each portion, (d) ->
						processed.push d.id

					setTimeout checkInstagram, checkInterval

			error: (err) ->
				log.error "Instagram error", err
				setTimeout checkInstagram, checkInterval


	# Get initial data
	Instagram.tags.recent
		name: hashtag,
		complete : (data) ->
			processed = _.map data, (d) -> d.id
			log.info "Got initial portion: #{processed.length} media items"
			log.info "Starting watcher. Interval: #{checkInterval}ms"
			do checkInstagram




	


	
