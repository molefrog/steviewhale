# socketio = require "socket.io"

# config = require "../utils/config"
# log    = require "../utils/log"

# module.exports = ->
# 	io = socketio.listen config.get "pool:port"

# 	io.sockets.on "connection", (socket) ->
# 		console.log socket

# 	return io