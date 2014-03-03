Q = require "q"

###
# This class represents pool connection
# The instances of that class are stored inside agent pool
### 
module.exports = class Client 
  constructor : (@socket) ->

  print : ( url ) ->
    deferred = do Q.defer

    # Send 'print' command to a client
    @socket.emit "print", url, (err) ->
      if err
        return deferred.reject err

      do deferred.resolve

    # Handle disconnect event
    # Helps when client has been disconnected while operation 
    # is processed
    @socket.on "disconnect", -> 
      deferred.reject "Socket connection closed"

    deferred.promise 

    
