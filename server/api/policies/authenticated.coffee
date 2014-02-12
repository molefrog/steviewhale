# This policy allows acccess only for authenticated users 
module.exports = (req, res, next) ->
	if req.user?
		return do next
	else 
		return next new Error "Not authenticated!"