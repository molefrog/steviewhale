winston = require "winston"

consoleTransport = new (winston.transports.Console)
  colorize : true

transports = [
  consoleTransport
]

module.exports = new (winston.Logger)
  transports : transports
  