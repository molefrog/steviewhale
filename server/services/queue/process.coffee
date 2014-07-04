kue    = require "kue"
_      = require "lodash"

pool   = require "../pool/clients"

{ config, log, uploader } = require "../../utils"
{ Shot, Station }         = require "../../models"

jobs = require "./jobs"
render = require "./render"

###
# Job processing function
###
jobs.process "print", (job, done) ->

  # TODO: think about the separation of individual and global logs
  logEvent = ( message ) ->
    job.log message
    log.info "[job ##{job.id}] #{message}"

  logEvent "Job started. Shot ##{job.data.id}"

  # Take shot instance from database
  Shot.findById( job.data.id )
  .exec (err, item) ->
    if err
      logEvent "Error getting shot from the db #{err}"
      return done "Database error"

    if not item?
      return done "Wrong element"

    tags = item.tags ? [ '' ]
    Station.findOne({}).where('hashtag').in(tags)
    .exec (err, station) ->
      # Check if the station pool is empty
      if _.isEmpty pool
        logEvent  "The pool is empty"
        return done "No available agents!"

      agent = null
      if not err and station
        logEvent "Concrete station ##{station.name} detected by tag ##{station.hashtag}"
        agent = pool[ station.name ]

        unless agent?
          logEvent "The station ##{station.name} if offline"
          return done "The station ##{station.name} if offline"
      else
         # Take random station
        logEvent "Take random station from the pool"
        idx = _.sample _.keys pool
        agent = pool[ idx ]

      logEvent "Selected station ##{agent.station.name}"

      render(item)
      .then (destination) ->
        imageToPrint = uploader.makeUrl destination
        logEvent "Rendered image into #{imageToPrint}"

        # Call 'print' function
        agent.print( imageToPrint )
        .then ->
          logEvent "Shot printed on station ##{agent.station.name}"

          item.printedOn = agent.station
          item.printed = new Date

          item.save (err) ->
            if err
              logEvent "Error updating printed shot's properties #{err}"

            done null
        .fail (err) ->
          logEvent "Error printing on station ##{agent.station.name}"
          done err

        .fin ->
          logEvent "Removing file #{imageToPrint}"
          uploader.delete destination

