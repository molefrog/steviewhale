async     = require "async"
moment    = require "moment"
Instagram = require "instagram-node-lib"
Q         = require "q"

{ Shot } = require "../models"
{ config, log, uploader } = require "../utils"

Instagram.set "client_id",     config.get "instagram:id"
Instagram.set "client_secret", config.get "instagram:secret"

module.exports.up = ->
  migrateShotFields = (shot, post, done) ->

    shot.user =
      id       : post.user.id
      name     : post.user.username
      fullname : post.user.full_name
      avatar   : ""

    if post.created_time?
      shot.post_created = moment.unix( post.created_time ).toDate()

    if post.caption.text?
      shot.caption = post.caption.text

    if post.tags?
      shot.tags = post.tags

    if post.link?
      shot.link = post.link

    Q.all([
      uploader.fromRemote(post.images.standard_resolution.url, "shots")
      uploader.fromRemote(post.images.low_resolution.url, "shots")
      uploader.fromRemote(post.images.thumbnail.url, "shots")
      uploader.fromRemote(post.user.profile_picture, "avatars")
    ]).then (images) ->
      shot.image_standard   = images[0]
      shot.image_low        = images[1]
      shot.image_thumbnail  = images[2]
      shot.user.avatar      = images[3]

      console.log images
      shot.save done

  changeShot = (shot, done) ->
    console.log "[+] Processing #{shot.hash}"
    Instagram.media.info
      media_id : shot.hash
      complete : (post) ->
        migrateShotFields shot, post, done

      error : (err) ->
        if err.toString() == "APINotAllowedError"
          console.log "[!] Shot has been deleted, removing"
          shot.remove done
        else
          console.log "STRANGE ERROR:", err, shot
          do done

  Shot.find {}, (err, shots) ->
    async.eachSeries shots, changeShot, (err) ->
      Shot.collection.update {}, {$unset: {image: true, instagram: true, thumbnail: true}}, {multi: true, safe: true}, (err) ->
        console.log "DONE",



