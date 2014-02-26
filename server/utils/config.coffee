module.exports = config = require "nconf"

config.argv()
  .env()

config.defaults 
  "config-file" : "./server/config.json"

config.file({ file: config.get "config-file" })