knox     = require "knox"
url      = require "url"
path     = require "path"
uid      = require "uid"
http     = require "http"
Q        = require "q"
knoxMpu  = require "knox-mpu"
mime     = require "mime"
needle   = require "needle"

config = require "./config"


storage =
  try
    knox.createClient
      provider : config.get 'uploader:provider'
      key      : config.get 'uploader:key'
      secret   : config.get 'uploader:secret'
      bucket   : config.get 'uploader:container'
  catch e

###
# Uploads remote file into specific folder
###
module.exports.fromRemote = (remote, location) ->
  deferred = Q.defer()
  parsed = url.parse remote

  filename = "#{uid 20}#{path.extname parsed.pathname}"
  destination = path.join config.get('env'), location, filename

  needle.head remote, (error, res) ->
    return deferred.reject(error) if error
    return deferred.reject('Wrong status code!') unless res.statusCode is 200

    headers =
      'Content-Length': res.headers['content-length']
      'Content-Type':   res.headers['content-type']
      'x-amz-acl':      'public-read'

    storage.putStream needle.get(remote), destination, headers, (err, res) ->
      return deferred.reject err if err
      deferred.resolve destination

  deferred.promise


###
# Uploads file from stream
###
module.exports.fromStream = (stream, location) ->
  deferred = Q.defer()

  destination = path.join config.get('env'), location

  upload = new knoxMpu
    client: storage
    objectName: destination
    stream : stream
    headers :
      'Content-Type' : mime.lookup(location)
      'x-amz-acl' : 'public-read'
  , (err, body) ->
    return deferred.reject err if err
    deferred.resolve destination

  deferred.promise

module.exports.makeUrl = (path) ->
  "#{config.get('uploader:base_url')}#{config.get('uploader:container')}/#{path}"


module.exports.delete = (filename) ->
  deferred = Q.defer()

  storage.deleteFile filename, (err, res) ->
    return deferred.reject err if err
    return deferred.reject "Wrong status code!" if res.statusCode != 204

    deferred.resolve()

  deferred.promise


