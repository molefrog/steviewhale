Faker    = require "Faker"
_        = require "lodash"
uid      = require "uid"
moment   = require "moment"

{ Station } = require "../../server/models"

module.exports.generate = (index, cb) ->
  station = new Station
    name         : uid 16
    secret       : uid 6
    title        : Faker.Lorem.sentence(3)
    subtitle     : Faker.Lorem.sentence(10)
    description  : Faker.Lorem.paragraph()
    instructions : Faker.Lorem.paragraph()

  station.save cb
