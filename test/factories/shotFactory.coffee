Faker    = require "Faker"
_        = require "lodash"
uid      = require "uid"
moment   = require "moment"

{ Shot } = require "../../server/models"

module.exports.availableStatuses = availableStatuses = [ "initial", "queued", "printed", "failed" ]

module.exports.generate = (index, cb) ->
  now = moment().unix()
  dayAfter = moment().add('days', 1).unix()

  payload =
    created   : moment.unix( now + _.random(0, dayAfter - now) ).toDate()
    hash      : uid 24
    image     : Faker.Image.imageUrl()
    thumbnail : Faker.Image.imageUrl()
    status    : _.sample availableStatuses
    instagram : {}

  if (payload.status == "printed") and @stations?.length > 0
    payload.printedOn = _.sample @stations

  shot = new Shot payload
  shot.save cb
