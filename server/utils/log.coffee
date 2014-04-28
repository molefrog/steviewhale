winston = require "winston"
moment  = require "moment"

transports = []

unless process.env.env is 'testing'
  consoleTransport = new (winston.transports.Console)
    colorize : true
    timestamp : ->
      moment().format("DD.MM HH:mm")
  transports.push consoleTransport

module.exports = new (winston.Logger)
  transports : transports
  
