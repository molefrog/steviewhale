module.exports.io = null

module.exports.emit = (event, options) ->
  return unless module.exports.io
  io = module.exports.io

  io.sockets.emit event, options
