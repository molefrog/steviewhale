winston = require "winston"
moment  = require "moment"


module.exports = log = new winston.Logger

unless process.env.env is 'testing'
  log.add winston.transports.Console,
    colorize : true
    timestamp : -> moment().format("DD.MM HH:mm")
