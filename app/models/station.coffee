
module.exports = class Station extends Chaplin.Model
  idAttribute: "name"
  
  urlRoot : "/api/stations"

  rename: (name, cb) -> 
    $.post "#{do @url}/rename", { name : name}, =>
      @set "name", name
      do cb

  secret: (cb) ->
    $.get "#{do @url}/secret", (data) =>
      cb data.secret




  
