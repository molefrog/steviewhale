mongoose = require "mongoose"
Schema   = mongoose.Schema

shotSchema = new Schema
	# When the shot was created 
	created : 
		type : Date
		default : Date.now

	# When the shot was printed
	printed : 
		type : Date

	# Shot's status. Can have following values:
	# "initial", "printed", "failed" 
	status :
		type : String 
		default : "initial"

	# URL to a photo
	source : 
		type : String
		required : true

	# Printer
	printed_on : 
		type : Schema.Types.ObjectId
		ref : "Station"

	# Unique instagram identifier 
	hash :
		type : "String"
		unique : true

	# Instagram field
	instagram : Schema.Types.Mixed


module.exports = mongoose.model "Shot", shotSchema