kue    = require "kue"
_      = require "lodash"

pool   = require "../pool/clients"

{ config, log } = require "../../utils"
{ Shot }        = require "../../models"

module.exports = jobs = require "./jobs"
require "./process"