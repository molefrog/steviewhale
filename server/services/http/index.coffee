express        = require "express"
bodyParser     = require "body-parser"
expressSession = require "express-session"
cookieParser   = require "cookie-parser"
multiparty     = require "connect-multiparty"
staticFiles    = require "st"
passport       = require "passport"
path           = require "path"

http = require "http"

{ config, log } = require "../../utils"

module.exports.app    = app    = do express
module.exports.server = server = http.createServer app

app.use do cookieParser 
app.use do bodyParser
app.use expressSession secret: config.get "web:cookieSecret"
app.use passport.initialize()
app.use passport.session()

app.use "/api", require "../../api"

unless config.get('env') is 'testing'
  app.use "/streaming", require "../streaming"
  # app.use "/queue",    (require "kue").app

publicPath = path.resolve "#{__dirname}/../../../public"

app.use staticFiles
  path: publicPath
  passthrough: true
  gzip: true
  index: 'index.html'

app.get "*", (req, res) ->
  res.sendfile path.join publicPath, "index.html"

# Error handler
app.use require "./errorHandler"

unless config.get('env') is 'testing'
  # Start express http server
  server.listen config.get("web:port"), (err) ->
    if err
      log.error "Web server error #{err}"
    else
      log.info "Web server started on port #{config.get('web:port')}"
