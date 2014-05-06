Instagram   = require "instagram-node-lib"
_           = require "lodash"
async       = require "async"
moment      = require "moment"
Q           = require "q"

# Util objects
{ log, config, uploader } = require "../../utils"

# Local models
Shot = require "../../models/shot"

Instagram.set "client_id",     config.get "instagram:id"
Instagram.set "client_secret", config.get "instagram:secret"

hashtag       = config.get "instagram:hashtag"
processed     = []
checkInterval = config.get "instagram:interval"

##
# This function processes one instagram item
##
processItem = (post, cb) ->
  if post.type != "image"
    return cb null

  log.info "#{post.user.username} posted image at #{post.link}"

  # save image and thumbnail to Amazon S3
  # Instagram item can be deleted!
  Q.all([
    uploader.fromRemote(post.images.standard_resolution.url, "shots")
    uploader.fromRemote(post.images.low_resolution.url, "shots")
    uploader.fromRemote(post.images.thumbnail.url, "shots")
    uploader.fromRemote(post.user.profile_picture, "avatars")
  ])
  .then (images) ->
    payload =
      hash      : post.id
      image_standard   : images[0]
      image_low        : images[1]
      image_thumbnail  : images[2]
      image_original   : post.images
      post_created     : moment.unix( post.created_time ).toDate()
      link             : post.link
      tags             : post.tags
      user :
        id       : post.user.id
        name     : post.user.username
        fullname : post.user.full_name
        avatar   : images[3]

    if post.caption?.text?
      payload.caption = post.caption.text

    shot = new Shot(payload)
    shot.save (err, item) ->
      if err
        log.error "Error saving new shot item #{err}"
        return cb null

      log.info "Saved new shot to db ##{item._id}. Moving it to the queue"

      # TODO: wait until the operation is complete
      item.queue ->

      # The default behaviour of async.each is to stop the whole process when
      # even just one item has failed.
      # We prevent this situation by ignoring 'save' error handling
      return cb null
  .fail (err) ->
    return cb null

##
# This function is used to check whether a new portion of media is
# available on Instagram
##
checkInstagram = ->
  Instagram.tags.recent
    name: hashtag,
    complete : (data) ->
      portion = _.filter data, (d) ->
        not _.contains processed, d.id

      async.each portion, processItem, (err) ->

        # Mark this portion as processed
        _.each portion, (d) ->
          processed.push d.id

        setTimeout checkInstagram, checkInterval

    error: (err) ->
      log.error "Instagram error #{err}"
      setTimeout checkInstagram, checkInterval


# Get initial data
Instagram.tags.recent
  name: hashtag,
  complete : (data) ->
    processed = _.map data, (d) -> d.id
    log.info "Got initial portion: #{processed.length} media items"
    log.info "Starting watcher. Interval: #{checkInterval}ms"
    do checkInstagram

# Force loading existing items
module.exports.forceLoad = (cb) ->
  Instagram.tags.recent
    name: hashtag,
    complete : (data) ->
      # Add every item to the db
      async.each data, processItem, cb
    error : cb







