socketio = require "socket.io"

{ server } = require "../http"

module.exports = io = socketio.listen server,
	log: false