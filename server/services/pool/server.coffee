config = require "../../utils/config"
log    = require "../../utils/log"

uid    = require "uid"
crypto = require "crypto"

Station = require "../../models/station"


hashing = (random, secret) ->
	crypto.createHash('md5').update(random + secret).digest('hex')


clients = require "./clients"

handshaked = (station, socket) ->
	log.info "Agent ##{station.name} connected"
	clients[ station.name ] = socket

	socket.on "disconnect", ->
		log.info "Agent #{station.name} disconnected"
		delete clients[ station.name ]

module.exports = (io) ->
	pool = io.of "/pool"

	pool.on "connection", (socket) ->
		random = uid 24

		log.info "New pool connection, sending random #{random}"

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

				socket.emit "handshake-success"
				handshaked station, socket
