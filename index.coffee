config = require "./app/utils/config"
log    = require "./app/utils/log"

express = require "express"

app = do express

app.use "/api", require "./app/api"
app.use express.errorHandler()


mongoose = require "mongoose"

mongoose.connect config.get "mongo:url"


app.set "port", config.get "port"

app.listen app.get("port"), (err) ->
	if err
		log.error "Web server error #{err}"
		process.exit 0

	log.info "Web server started on port #{app.get('port')}"


