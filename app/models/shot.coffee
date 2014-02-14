module.exports = class Shot extends Chaplin.Model
	idAttribute : "_id"
	urlRoot : "/api/shots"
	url : -> "/api/shots/#{@id}"