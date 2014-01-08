Instagram 	= require "instagram-node-lib"
cups 		= require "cupsidity"
request 	= require "request"
_  			= require "lodash"
fs 			= require "fs"

module.exports = (hashtag) ->
	processed = []
	checkInterval = 4000

	download = (uri, filename, cb) ->
		r = request(uri).pipe(fs.createWriteStream(filename))
		r.on "close", cb


	processItem = (data, cb) ->
		if data.type != "image"
			return do cb

		console.log data.user.username, "posted image at", data.link

		# Doesn't work until app gets whitelisted
		#
		# Instagram.media.comment
		# 	media_id: data.id
		# 	access_token : access_token
		# 	text: 'Instagame was here.'
		# 	complete : ->
		# 		console.log "complete"
		# 	error : (errorMessage, errorObject, caller, response) ->
		# 		console.log errorMessage, errorMessage, caller, response

		filename = "download/" + data.id + ".jpg"
		download data.images.standard_resolution.url, filename , ->
			jobId = cups.printFile
				dest : cups.getDefault()
				title : filename
				filename : filename
				options : 
					media : "Postcard(4x6in)"
			console.log "Jobid", jobId
			do cb


	Instagram.tags.recent
			name: hashtag,
			complete : (data) ->
				processed = _.map data, (d) -> d.id
				console.log "Instagram watcher started"
				do run

	run = ->
		Instagram.tags.recent
			name: hashtag,
			complete : (data) ->
				portion = _.filter data, (d) ->
					not _.contains processed, d.id

				console.log portion.length

				if portion.length > 0 
					processItem portion[0], ->
						processed.push portion[0].id
						setTimeout run, checkInterval
				else
					setTimeout run, checkInterval

			error: (err) ->
				console.log "Instagram error", err
				setTimeout run, checkInterval
