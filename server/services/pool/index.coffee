config = require "../../utils/config"
log    = require "../../utils/log"

uid    = require "uid"
crypto = require "crypto"

Station = require "../../models/station"


###
# Hashing function that is used for handshake
###
hashing = (random, secret) ->
  crypto.createHash('md5').update(random + secret).digest('hex')

###
# The array of authorized and online agents
# This approach will not work when the server is clustered on 
# more than one machine. TODO: make this work through some fast
# key-value storage (e.g. Redis)
###
clients = require "./clients"

Client = require "./client"

###
# This function is called when the agent has passed the handshake 
# (has been authorized)
###
handshaked = (station, socket) ->
  log.info "Agent ##{station.name} connected"
  clients[ station.name ] = new Client( socket )

  socket.on "disconnect", ->
    log.info "Agent #{station.name} disconnected"
    delete clients[ station.name ]


###
# This function configures socket.io server to accept agent connections
###
io = require "../io"
pool = io.of "/pool"

# Got new connection
pool.on "connection", (socket) ->

  # Generate some random number and send it to an agent
  random = uid 24

  log.info "New pool connection, sending random #{random}"

  # Agent then calculates hash based on a random number and 
  # secret auth key
  socket.emit "handshake", random, (name, hash) ->
    log.info "Got answer name: #{name}, hash: #{hash}"

    Station.findOne { name }, (err, station) ->
      if err
        log.error "Database error #{err}"
        return do socket.disconnect

      if not station?
        log.error "No such station #{name}"
        return do socket.disconnect

      if station.online
        log.error "Agent ##{name} already connected"
        return do socket.disconnect

      originalHash = hashing random, station.secret

      if hash != originalHash
        log.error "Handshake for ##{name} failed: wrong secret"
        return do socket.disconnect

      # Notify agent about successful auth
      socket.emit "handshake-success"
      handshaked station, socket
