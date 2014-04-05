twilio      = require "twilio"
request     = require "request"
_           = require "lodash"

log    = require "./log"
config = require "./config"

twilioClient = null

switch config.get("sms:provider")
  when "twilio"
    accountSid = config.get "sms:twilio:apiKey"
    authToken  = config.get "sms:twilio:apiSecret"

    if not twilioClient?
      if accountSid and authToken
        twilioClient = twilio accountSid, authToken

    module.exports = (settings, callback) ->
      twilioClient?.messages.create
        to   : settings.to
        from : config.get "sms:twilio:fromNumber"
        body : settings.body
      , (err, message) ->
        log.info "SMS message has been sent to #{settings.to} using Twilio provider"

        callback? err

  when "nexmo"
    module.exports = (settings, callback) ->
      request
        url : "http://rest.nexmo.com/sms/json"
        qs :
          api_key    : config.get "sms:nexmo:apiKey"
          api_secret : config.get "sms:nexmo:apiSecret"
          from       : config.get "sms:nexmo:fromNumber"
          to         : settings.to
          text       : settings.body
          type       : "unicode"
        , (err, res, body) ->
          log.info "SMS message has been sent to #{settings.to} using Nexmo provider"

          callback? err
  else
    module.exports = (settings, callback) ->
      log.warn "SMS provider not implemented"
      callback? "No provider available!"
