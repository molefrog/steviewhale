Faker    = require "Faker"
_        = require "lodash"
uid      = require "uid"
moment   = require "moment"

{ Shot } = require "../../server/models"

module.exports.availableStatuses = availableStatuses = [ "initial", "queued", "printed", "failed" ]

module.exports.generate = (index, cb) ->
  payload =
    hash      : uid 24
    image     : Faker.Image.imageUrl()
    thumbnail : Faker.Image.imageUrl()
    status    : _.sample availableStatuses
    instagram : {}

  if @startDate? and @endDate?
    s = moment(@startDate).unix()
    e = moment(@endDate).unix()
    payload.created = moment.unix(s + _.random(0, e - s) ).toDate()

  if (payload.status == "printed") and @stations?.length > 0
    payload.printedOn = _.sample @stations

  shot = new Shot payload
  shot.save cb
