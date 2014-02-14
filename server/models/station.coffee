_        = require "lodash"
mongoose = require "mongoose"
Schema   = mongoose.Schema

pool = require "../services/pool/clients"

schemaOptions = 
	toJSON : 
		virtuals : true
	toObject : 
		virtuals : true

stationSchema = new Schema 
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
, schemaOptions

# "online" virtual property
# The station is online if it is in the station pool
stationSchema
	.virtual( "online" )
	.get -> _.has pool, @name


module.exports = mongoose.model "Station", stationSchema