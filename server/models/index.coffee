try
  mongoose = require 'mongoose'
  denied = mongoose.__proto__.mquery.permissions.count
  delete denied.sort
catch e

module.exports =
  Shot    : require "./shot"
  Station : require "./station"
  User    : require "./user"
