fs   = require "fs"
path = require "path"

# Local modules
log  = require "./log"


module.exports = config = require "nconf"

config.argv().env()

config.defaults
  env : 'development'

log.info "Environment: #{config.get('env')}"

configFile = path.resolve "#{__dirname}/../config/#{config.get('env')}.json"

log.info "Config file: #{configFile}"

# Check if config file exists
if not fs.existsSync configFile
  log.warn "Config file #{configFile} doesn't exist. Default values will be used!"

config.file({ file: configFile })

config.set("db:mongo", 'mongodb://localhost') unless config.get('db:mongo')
config.set("web:port", 8080) unless config.get('web:port')
config.set("web:cookieSecret", 'keyboard-cat') unless config.get('web:cookieSecret')

##
# Add Logentries transport if token is present
##
logentriesToken = config.get 'logentries:token'

if logentriesToken
  winston    = require "winston"
  logentries = require "node-logentries"

  logger = logentries.logger
    token: logentriesToken
    timestamp: false
    printerror: false

  # By some undefined reasons node-logentries doesn't expose winston
  # transport, so we have to attach it using this little hack
  logger.winston winston
  log.add winston.transports.LogentriesLogger
