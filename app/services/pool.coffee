config = require "../utils/config"
log    = require "../utils/log"

module.exports = (io) ->
	pool = io.of "/pool"

	pool.on "connection", (socket) ->
		
		socket.on "handshake", (user, password, cb) ->
			cb true