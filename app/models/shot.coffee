mongoose = require "mongoose"

Schema = mongoose.Schema

shotSchema = new Schema 
	created : 
		type : Date
		default : Date.now
	printed : Date
	status :
		type : String 
		default : "initial"
	printed_on : 
		type : Schema.Types.ObjectId
		ref : "Station"
	instagram : Schema.Types.Mixed


module.exports = mongoose.model "Shot", shotSchema