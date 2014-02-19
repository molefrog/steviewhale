http = require "http"

{ config, log } = require "../../utils"


module.exports.app = app = do require "express"
module.exports.server = server = http.createServer app

# Start express http server
server.listen config.get("web:port"), (err) ->
	if err
		log.error "Web server error #{err}"
	else
		log.info "Web server started on port #{config.get('web:port')}"
