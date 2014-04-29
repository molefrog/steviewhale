should   = require "should"
request  = require "supertest"
async    = require "async"
Faker    = require "Faker"
_        = require "lodash"
uid      = require "uid"
moment   = require "moment"

{ Shot, Station } = require "../../server/models"

propertiesToCheck = [
  "_id"
  "image"
  "thumbnail"
  "created"
  "printed"
]

availableStatuses = [ "initial", "queued", "printed", "failed" ]

shotFactory = (index, cb) ->
  now = moment().unix()
  dayAfter = moment().add('days', 1).unix()

  shot = new Shot
    created   : moment.unix( now + _.random(0, dayAfter - now) ).toDate()
    hash      : uid 24
    image     : Faker.Image.imageUrl()
    thumbnail : Faker.Image.imageUrl()
    status    : _.sample availableStatuses
    instagram : {}

  shot.save (err, doc) ->
    cb err, JSON.parse(JSON.stringify(doc))


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
            meta.should.have.enumerable 'count', json.shots.length

            _.each json.shots, (shot) =>
              idx = _.findIndex @shots, "_id": shot._id

              idx.should.not.eql -1
              lhs = _.pick(shot, propertiesToCheck)
              rhs = _.pick(@shots[idx], propertiesToCheck)

              lhs.should.eql rhs

            do done

      it "supports 'limit' query parameter", (done) ->
        limit = _.random(1, @numberOfShots)

        request(app)
          .get('/api/shots')
          .query({ limit : limit })
          .expect('Content-Type', 'application/json')
          .expect(200)
          .end (err, res) =>
            return done err if err

            res.body.meta.should.have.enumerable 'count', limit

            lhs = _(@shots).sortBy (s) -> -moment(s.created).unix()
              .first(limit)
              .collect (s) -> _.pick(s, propertiesToCheck)
              .value()

            rhs = _(res.body.shots).collect (s) -> _.pick(s, propertiesToCheck)
              .value()

            lhs.should.eql rhs
            do done

      it "supports filtering by a single status", (done) ->
        status = _.sample availableStatuses

        request(app)
          .get('/api/shots')
          .query({ status })
          .expect('Content-Type', 'application/json')
          .expect(200)
          .end (err, res) =>
            return done err if err

            lhs = _(@shots).sortBy (s) -> -moment(s.created).unix()
              .filter (s) -> s.status is status
              .collect (s) -> _.pick(s, propertiesToCheck)
              .value()

            res.body.meta.should.have.enumerable 'total', lhs.length

            rhs = _(res.body.shots).collect (s) -> _.pick(s, propertiesToCheck)
              .value()

            _.first(lhs, res.body.meta.count).should.eql rhs
            do done

      it "supports filtering by multiple statuses", (done) ->
        statuses = _.sample availableStatuses, _.random(1, availableStatuses.length)

        request(app)
          .get('/api/shots')
          .query({ status : statuses })
          .expect('Content-Type', 'application/json')
          .expect(200)
          .end (err, res) =>
            return done err if err

            lhs = _(@shots).sortBy (s) -> -moment(s.created).unix()
              .filter (s) -> _.contains(statuses, s.status)
              .collect (s) -> _.pick(s, propertiesToCheck)
              .value()

            res.body.meta.should.have.enumerable 'total', lhs.length

            rhs = _(res.body.shots).collect (s) -> _.pick(s, propertiesToCheck)
              .value()

            _.first(lhs, res.body.meta.count).should.eql rhs
            do done



      # it "suppor"
