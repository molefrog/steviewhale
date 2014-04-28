fs   = require "fs"
path = require "path"

# Local modules
log  = require "./log"

module.exports = config = require "nconf"

config.argv()
  .env()

config.defaults
  env : 'development'
  web :
    port   : 8080
    cookieSecret : 'keyboard-cat'
  db :
    mongo : 'mongodb://localhost'

log.info "Environment: #{config.get('env')}"

configFile = path.resolve "#{__dirname}/../config/#{config.get('env')}.json"

log.info "Config file: #{configFile}"

# Check if config file exists
if not fs.existsSync configFile
  log.warn "Config file #{configFile} doesn't exist. Default values will be used!"

config.file({ file: configFile })
