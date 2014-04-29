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

  shot.save (err, doc) ->
    cb err, JSON.parse(JSON.stringify(doc))


propertiesToCheck = [
  "_id"
  "image"
  "thumbnail"
  "created"
  "printed"
]


module.exports = (app) ->
  describe "shots resource", ->

    describe "GET /api/shots", ->

      before (done) ->
        @numberOfShots = _.random(10, 20)
        Shot.remove({}).exec (err) =>
          async.map [1..@numberOfShots], _.bind(shotFactory, @), (err, shots) =>
            return done err if err
            @shots = shots
            do done

      it "just returns some of the latest shots when nothing is passed", (done) ->
        request(app)
          .get("/api/shots")
          .expect('Content-Type', 'application/json')
          .expect(200)
          .end (err, res) =>
            return done err if err

            json = JSON.parse res.text

            json.should.have.property 'meta'
            json.should.have.property 'shots'
            meta = res.body.meta

            meta.should.have.enumerable 'total', @shots.length
            meta.should.have.enumerable 'count'

            meta.count.should.be.exactly json.shots.length

            _.each json.shots, (shot) =>
              idx = _.findIndex @shots, "_id": shot._id

              idx.should.not.eql -1
              lhs = _.pick(shot, propertiesToCheck)
              rhs = _.pick(@shots[idx], propertiesToCheck)

              lhs.should.eql rhs

            do done
