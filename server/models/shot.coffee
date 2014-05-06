mongoose = require "mongoose"
Schema   = mongoose.Schema

shotSchema = new Schema
  # When the shot was created
  created :
    type : Date
    default : Date.now

  # When the shot was printed
  printed : Date

  # When the original post was created
  post_created : Date

  # Shot's status. Can have following values:
  # "initial", "queued", "printed", "failed"
  status :
    type : String
    default : "initial"

  # URL to a photo
  image_standard :
    type : String
    required : true

  image_low :
    type : String

  image_thumbnail :
    type : String

  # Printer
  printedOn :
    type : Schema.Types.ObjectId
    ref : "Station"

  # Unique instagram identifier
  hash :
    type : "String"
    unique : true

  # Post caption
  caption : String

  # Tags associated with the post
  tags : [ String ]

  link : String

  user :
    id       : String
    name     : String
    fullname : String
    avatar   : String

  # Instagram field
  instagram : Schema.Types.Mixed

shotSchema.methods.queue = require "./shotQueue"

module.exports = mongoose.model "Shot", shotSchema
