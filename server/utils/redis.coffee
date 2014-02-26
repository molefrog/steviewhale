url   = require "url"
redis = require "redis"

module.exports = (redisUrl) ->
  settings   = url.parse redisUrl

  redisClient = redis.createClient settings.port, settings.hostname
  redisClient.auth settings.auth.split(":")[1]

  return redisClient
