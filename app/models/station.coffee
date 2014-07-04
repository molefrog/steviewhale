singleLowerWord = (word) ->
  return false unless word
  return false unless word.split(' ').length is 1
  _.every word.split(''), (c) ->
    c.toLowerCase() is c

latinWord = (word) ->
  return false unless word
  latinAlphabet = 'abcdefghijklmopqrstuqvwxyz1234567890'.split ''
  _.every word.split(''), (c) -> c.toLowerCase() in latinAlphabet


module.exports = class Station extends Chaplin.Model
  idAttribute: '_id'

  urlRoot : "/api/stations"

  validate: (attrs, options) ->
    if attrs.hashtag
      unless singleLowerWord(attrs.hashtag)
        return 'hashtag should be single lowercase word'

    if attrs.name
      unless singleLowerWord(attrs.name) and latinWord(attrs.name)
        return 'name should be single latin lowercase word'

  url: ->
    return @urlRoot unless @get 'name'
    name = if @hasChanged('name') then @previous('name') else @get('name')
    "#{@urlRoot}/#{name}"

  secret: (cb) ->
    $.get "#{do @url}/secret", (data) =>
      cb data.secret




