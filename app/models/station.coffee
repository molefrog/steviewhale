mongoose = require "mongoose"

stationSchema = new mongoose.Schema 
	# The name of the station is used as a main id
	name : 
		type      : String 
		unique    : true 
		index     : true
		lowercase : true
		trim      : true

	# Secret key that is used by station client 
	secret :
		type : String
		required : true

	# The station's short title, e.g. "My home station"
	title :
		type : String 
		required : true

	# More detailed description of the station
	description : 
		type : String

	# Some instructions of how to get photo
	instructions :
		type : String

	# When the station was created
	created :
		type : Date
		default : Date.now

module.exports = mongoose.model "Station", stationSchema