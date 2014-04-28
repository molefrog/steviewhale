Shot   = require "../../models/shot"

log = require "../../utils/log"

# Fields that are used for population of the 
# 'printedOn' field
populatedFields = [ 
  "_id" 
  "name" 
  "title"
  "subtitle"
  "instructions" 
  "created" 
  "online"
  "streaming"
]

###
# Get all shots
###
exports.index = (req, res, next) ->
  Shot.find({})
  .sort("-created")
  .populate("printedOn", populatedFields.join " ")
  .exec (err, items) ->
    if err 
      return next err

    res.json items

###
# Get specified shot 
###
exports.show = (req, res, next) ->
  Shot.findById( req.params.id )
  .populate("printedOn", populatedFields.join " ")
  .exec (err, item) ->
    if err 
      return next err

    if not item?
      return next new Error "Shot not found"

    res.json item

###
# Delete existing shot
###
exports.delete = (req, res, next) ->
  Shot.remove({ _id : req.params.id })
  .exec (err) ->
    if err 
      return next err

    res.json {}

##
# TODO: move enque method to a separate module
##
exports.queue = (req, res, next) ->
  Shot.findById( req.params.id )
  .exec (err, item) ->
    item.queue ->
      res.json {}
