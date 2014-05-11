Faker    = require "Faker"
_        = require "lodash"
uid      = require "uid"
moment   = require "moment"

{ Shot } = require "../../server/models"

module.exports.availableStatuses = availableStatuses = [ "initial", "queued", "printed", "failed" ]

module.exports.generate = (index, cb) ->
  payload =
    hash      : uid 24
    image_standard  : Faker.Image.imageUrl()
    image_thumbnail : Faker.Image.imageUrl()
    image_low       : Faker.Image.imageUrl()
    caption   : Faker.Lorem.sentence()
    tags      : Faker.Lorem.words(3)
    link      : Faker.Image.imageUrl()
    user :
      id       : uid 5
      name     : Faker.Name.findName()
      username : Faker.Internet.userName()
      avatar   : Faker.random.avatar_uri()
    status    : _.sample availableStatuses
    image_original : {}

  if @startDate? and @endDate?
    s = moment(@startDate).unix()
    e = moment(@endDate).unix()
    payload.created = moment.unix(s + _.random(0, e - s) ).toDate()

  if (payload.status == "printed") and @stations?.length > 0
    payload.printedOn = _.sample @stations

  shot = new Shot payload
  shot.save cb
