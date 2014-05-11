_      = require "lodash"
moment = require "moment"

Shot   = require "../../models/shot"

log = require "../../utils/log"
uploader = require "../../utils/uploader"

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

readAccesibleFields = [
  "_id"
  "created"
  "printed"
  "post_created"
  "status"
  "caption"
  "hash"
  "link"
  "tags"
  "user"
  "image_standard"
  "image_low"
  "image_thumbnail"
  "printedOn"
]

transformUrls = (shot) ->
  shot.image_standard  = uploader.makeUrl shot.image_standard
  shot.image_low       = uploader.makeUrl shot.image_low
  shot.image_thumbnail = uploader.makeUrl shot.image_thumbnail
  shot.user.avatar     = uploader.makeUrl shot.user.avatar
  shot

###
# Get all shots
###
exports.index = (req, res, next) ->
  limit = parseInt(req.query.limit ? 20)
  sortBy = "-created"

  findQuery = {}

  if req.query.status?
    statuses = _.flatten [ req.query.status ]
    findQuery.status = { $in : statuses }

  if req.query.printed_on?
    findQuery.printedOn = req.query.printed_on

  if req.query.max_timestamp?
    date = moment.unix(parseInt(req.query.max_timestamp)).toDate()
    findQuery.created = { $lte : date }

  Shot.find(findQuery).count (err, count) ->
    return next err if err

    Shot.find(findQuery)
      .sort(sortBy)
      .limit(limit)
      .select(readAccesibleFields.join(' '))
      .populate("printedOn", populatedFields.join " ")
      .exec (err, items) ->
        return next err if err

        meta =
          query : req.query
          limit : limit
          total : count
          count : items.length

        res.json
          meta  : meta
          shots : _.map items, transformUrls

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

    res.json shot: transformUrls item

###
# Delete existing shot
###
exports.delete = (req, res, next) ->
  Shot.findById( req.params.id )
  .exec (err, shot) ->
    return next err if err
    return next new Error "Shot not found" unless shot?

    _.map [ shot.image_standard, shot.image_low, shot.image_thumbnail, shot.user.avatar ], uploader.delete

    Shot.remove({ _id : req.params.id })
    .exec (err) ->
      return next err if err
      res.json {}

##
# TODO: move enque method to a separate module
##
exports.queue = (req, res, next) ->
  Shot.findById( req.params.id )
  .exec (err, item) ->
    item.queue ->
      res.json {}
