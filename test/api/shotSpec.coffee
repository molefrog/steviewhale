should   = require "should"
request  = require "supertest"
async    = require "async"
Faker    = require "Faker"
_        = require "lodash"
uid      = require "uid"
moment   = require "moment"

{ Shot, Station } = require "../../server/models"

shotFactory    = require "../factories/shotFactory"
stationFactory = require "../factories/stationFactory"

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
        @startDate = moment()
        @endDate = moment( @startDate ).add('days', 1)

        @numberOfStations = _.random(2, 5)
        @numberOfShots    = _.random(10, 20)

        Station.remove({}).exec (err) =>
          async.map [1..@numberOfStations], _.bind(stationFactory.generate, @), (err, stations) =>
            return done err if err
            @stations = stations
            @stationsJson = _.map stations, (s) -> JSON.parse JSON.stringify s

            Shot.remove({}).exec (err) =>
              async.map [1..@numberOfShots], _.bind(shotFactory.generate, @), (err, shots) =>
                return done err if err
                @shots = shots
                @shotsJson = _.map shots, (s) -> JSON.parse JSON.stringify s

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

            meta.should.have.enumerable 'total', @shotsJson.length
            meta.should.have.enumerable 'count', json.shots.length

            _.each json.shots, (shot) =>
              idx = _.findIndex @shotsJson, "_id": shot._id

              idx.should.not.eql -1
              lhs = _.pick(shot, propertiesToCheck)
              rhs = _.pick(@shotsJson[idx], propertiesToCheck)

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

            lhs = _(@shotsJson).sortBy (s) -> -moment(s.created).unix()
              .first(limit)
              .collect (s) -> _.pick(s, propertiesToCheck)
              .value()

            rhs = _(res.body.shots).collect (s) -> _.pick(s, propertiesToCheck)
              .value()

            lhs.should.eql rhs
            do done

      it "supports filtering by a single status", (done) ->
        status = _.sample shotFactory.availableStatuses

        request(app)
          .get('/api/shots')
          .query({ status })
          .expect('Content-Type', 'application/json')
          .expect(200)
          .end (err, res) =>
            return done err if err

            lhs = _(@shotsJson).sortBy (s) -> -moment(s.created).unix()
              .filter (s) -> s.status is status
              .collect (s) -> _.pick(s, propertiesToCheck)
              .value()

            res.body.meta.should.have.enumerable 'total', lhs.length

            rhs = _(res.body.shots).collect (s) -> _.pick(s, propertiesToCheck)
              .value()

            _.first(lhs, res.body.meta.count).should.eql rhs
            do done

      it "supports filtering by multiple statuses", (done) ->
        statuses = _.sample shotFactory.availableStatuses, _.random(1, shotFactory.availableStatuses.length)

        request(app)
          .get('/api/shots')
          .query({ status : statuses })
          .expect('Content-Type', 'application/json')
          .expect(200)
          .end (err, res) =>
            return done err if err

            lhs = _(@shotsJson).sortBy (s) -> -moment(s.created).unix()
              .filter (s) -> _.contains(statuses, s.status)
              .collect (s) -> _.pick(s, propertiesToCheck)
              .value()

            res.body.meta.should.have.enumerable 'total', lhs.length

            rhs = _(res.body.shots).collect (s) -> _.pick(s, propertiesToCheck)
              .value()

            _.first(lhs, res.body.meta.count).should.eql rhs
            do done

      it "supports filtering by station", (done) ->
        async.each @stationsJson, (station, cb) =>
          request(app)
            .get('/api/shots')
            .query({ printed_on : station._id })
            .expect('Content-Type', 'application/json')
            .expect(200)
            .end (err, res) =>

              lhs = _(@shotsJson).sortBy (s) -> -moment(s.created).unix()
                .filter (s) -> s.printedOn? and s.printedOn.toString() == station._id
                .collect (s) -> _.pick(s, propertiesToCheck)
                .value()

              res.body.meta.should.have.enumerable 'total', lhs.length

              rhs = _(res.body.shots).collect (s) -> _.pick(s, propertiesToCheck)
                .value()

              _.first(lhs, res.body.meta.count).should.eql rhs
              do cb

        , (err) ->
          return done err if err
          do done

      it "supports pagination using 'max_timestamp' parameter", (done) ->
        async.each [1..6], (i, cb) =>
          s = @startDate.unix()
          e = @endDate.unix()

          max_timestamp = s + _.random(0, e - s)

          request(app)
            .get('/api/shots')
            .query({ max_timestamp })
            .expect('Content-Type', 'application/json')
            .expect(200)
            .end (err, res) =>

              lhs = _(@shotsJson).sortBy (s) -> -moment(s.created).unix()
                .filter (s) -> moment(s.created).unix() < max_timestamp
                .collect (s) -> _.pick(s, propertiesToCheck)
                .value()

              res.body.meta.should.have.enumerable 'total', lhs.length

              rhs = _(res.body.shots).collect (s) -> _.pick(s, propertiesToCheck)
                .value()

              _.first(lhs, res.body.meta.count).should.eql rhs
              do cb

        , (err) ->
          return done err if err
          do done
