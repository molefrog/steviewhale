Instagram 	= require "instagram-node-lib"
cups 		= require "cupsidity"
request 	= require "request"
_  			= require "lodash"
fs 			= require "fs"

##
# Config file
##
config   = require "nconf"
config.argv()
	.env()

config.defaults 
	"config-file" : "config.json"

config.file({ file: config.get "config-file" })


Instagram.set "client_id", 		config.get "instagram:id"
Instagram.set "client_secret", 	config.get "instagram:secret"

hashtag = config.get "hashtag"

processed = []
checkInterval = 3000

download = (uri, filename, cb) ->
	r = request(uri).pipe(fs.createWriteStream(filename))
	r.on("close", cb)


processItem = (data, cb) ->
	if data.type != "image"
		return do cb

	console.log data.user.username, "posted image at", data.link

	filename = "download/" + data.id + ".jpg"
	download data.images.standard_resolution.url, filename , ->
		cups.printFile
			dest : cups.getDefault()
			title : filename
			filename : filename
			options : 
				media : "Postcard(4x6in)"

		do cb


Instagram.tags.recent
		name: hashtag,
		complete : (data) ->
			processed = _.map data, (d) -> d.id
			do run

run = ->
	Instagram.tags.recent
		name: hashtag,
		complete : (data) ->
			portion = _.filter data, (d) ->
				not _.contains processed, d.id

			if portion.length > 0 
				processItem portion[0], ->
					processed.push portion[0].id
					do run
			else
				setTimeout run, checkInterval




