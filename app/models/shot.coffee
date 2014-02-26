module.exports = class Shot extends Chaplin.Model
  
  idAttribute : "_id"

  urlRoot : "/api/shots"

  print : ->
    $.get("#{@url()}/queue")
    .done =>
      @.set "status", "queued"
