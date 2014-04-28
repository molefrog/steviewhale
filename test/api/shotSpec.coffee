should   = require "should"
request  = require "supertest"

module.exports = (app) ->
  describe "shots resource", ->

    describe "GET /api/shots", ->
      it "returns 200", ->
        request(app)
          .get("/api/shots")
          .expect(200)
          .end (err, res) ->
            return done err if err
            do done
