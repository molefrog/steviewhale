{ config, log } = require "../../utils"

###
# Slightly modified default connect error handler,
# which doesn't output annoying call stacks to the
# console
###
module.exports = (err, req, res, next) ->
  log.error "Web: #{err}"

  if err.status
    res.statusCode = err.status

  if res.statusCode < 400
    res.statusCode = 500

  accept = req.headers.accept || ''

  if accept.indexOf('json') != -1
    res.setHeader 'Content-Type', 'application/json'
    res.end( JSON.stringify({ error: err }) )
  else
    res.setHeader 'Content-Type', 'text/plain'
    res.end err.toString()

