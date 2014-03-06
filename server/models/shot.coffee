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
  # "initial", "queued", "printed", "failed" 
  status :
    type : String 
    default : "initial"

  # URL to a photo
  image : 
    type : String
    required : true

  thumbnail :
    type : String

  # Printer
  printedOn : 
    type : Schema.Types.ObjectId
    ref : "Station"

  # Unique instagram identifier 
  hash :
    type : "String"
    unique : true

  # Instagram field
  instagram : Schema.Types.Mixed

shotSchema.methods.queue = require "./shotQueue"

module.exports = mongoose.model "Shot", shotSchema
