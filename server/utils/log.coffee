winston = require "winston"
moment  = require "moment"

consoleTransport = new (winston.transports.Console)
  colorize : true
  timestamp : ->
  	moment().format("DD.MM HH:mm")


transports = [
  consoleTransport
]

module.exports = new (winston.Logger)
  transports : transports
  
