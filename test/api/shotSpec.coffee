should   = require "should"
request  = require "supertest"
async    = require "async"
Faker    = require "Faker"
_        = require "lodash"
uid      = require "uid"

{ Shot, Statio } = require "../../server/models"

shotFactory = (index, cb) ->
  shot = new Shot
    hash      : uid 24
    image     : Faker.Image.imageUrl()
    thumbnail : Faker.Image.imageUrl()
    instagram : {}

  shot.save cb


module.exports = (app) ->
  describe "shots resource", ->

    describe "GET /api/shots", ->

      before (done) ->
        Shot.remove({}).exec (err) =>
          async.map [1..20], _.bind(shotFactory, @), (err, shots) =>
            return done err if err
            @shots = shots
            do done

      it "returns 200", (done) ->
        request(app)
          .get("/api/shots")
          .expect(200)
          .end (err, res) ->
            return done err if err
            do done
