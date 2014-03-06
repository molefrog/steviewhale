kue    = require "kue"
_      = require "lodash"

pool   = require "../pool/clients"

{ config, log } = require "../../utils"
{ Shot }        = require "../../models"

jobs = require "./jobs"

###
# Job processing function
###
jobs.process "print", (job, done) ->

  # TODO: think about the separation of individual and global logs
  logEvent = ( message ) ->
    job.log message
    log.info "[job ##{job.id}] #{message}"

  logEvent "Job started. Shot ##{job.data.id}"

  # Check if the station pool is empty
  if _.isEmpty pool
    logEvent  "The pool is empty"
    
    return done "No available agents!"

  # Take random station
  idx = _.sample _.keys pool
  agent = pool[ idx ]

  logEvent "Selected station ##{agent.station.name}"
  
  # Take shot instance from database
  Shot.findById( job.data.id )
  .exec (err, item) ->
    if err
      logEvent "Error getting shot from the db #{err}"

      return done "Database error"

    if not item?
      return done "Wrong element"

    # Call 'print' function
    agent.print( item.image )
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

