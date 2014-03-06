express    = require "express"
multiparty = require "connect-multiparty"
passport   = require "passport"
path       = require "path"

http = require "http"

{ config, log } = require "../../utils"

module.exports.app    = app    = do express
module.exports.server = server = http.createServer app

###
# Configuration for all environments
###
app.configure ->
  app.use express.cookieParser()  
  app.use multiparty()
  app.use express.json()
  app.use express.urlencoded()

  app.use express.session
    secret : config.get "web:cookieSecret"

  app.use passport.initialize()
  app.use passport.session()

  app.use "/api",       require "../../api"
  app.use "/streaming", require "../streaming"
  app.use "/queue",    (require "kue").app

  publicPath = path.resolve "#{__dirname}/../../../public"

  app.use express.static publicPath

  app.use app.router
  app.get "*", (req, res) ->
    res.sendfile path.join publicPath, "index.html"

  # Error handler
  app.use require "./errorHandler"


# Start express http server
server.listen config.get("web:port"), (err) ->
  if err
    log.error "Web server error #{err}"
  else
    log.info "Web server started on port #{config.get('web:port')}"
