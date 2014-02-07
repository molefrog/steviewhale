module.exports = app = do require "express"

StationController = require "./station"

app.get    "/stations",       StationController.index
app.get    "/stations/:name", StationController.show 
app.delete "/stations/:name", StationController.delete
app.post   "/stations",       StationController.create
app.put    "/stations/:name", StationController.update
