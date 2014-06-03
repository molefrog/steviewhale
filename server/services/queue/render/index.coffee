Canvas  = require "canvas"
fs      = require "fs"
Q       = require "q"
uid     = require "uid"
path    = require "path"
request = require "request"
_       = require "lodash"

uploader = require "../../../utils/uploader"

###
# Fonts
###
fontFile = (name) -> path.resolve( path.join __dirname, 'fonts', name)

ptSansFont = new Canvas.Font 'PTSans', fontFile('PTS.ttf')
ptSansFont.addFace fontFile('PTSB.ttf'), 'bold'

ptSansNarrowFont = new Canvas.Font 'PTSansNarrow', fontFile('PTSN.ttf')
ptSansNarrowFont.addFace fontFile('PTSNB.ttf'), 'bold'

supportedFonts = [
  ptSansFont
  ptSansNarrowFont
]

###
# Properties
###
P = require "./properties"

###
# Draws text with text wraps
###
wrapText = (ctx, text, x, y, maxWidth, maxHeight, lineHeight) ->
  words = text.split ' '
  line = ''

  for n in [ 0...words.length ]
    testLine = line + words[n] + ' '
    metrics = ctx.measureText(testLine)
    testWidth = metrics.width

    if (testWidth > maxWidth && n > 0)
      newHeight = y + lineHeight
      if newHeight > maxHeight
        ctx.fillText(line + '...', x, y, maxWidth)
        return

      ctx.fillText(line, x, y, maxWidth)
      line = words[n] + ' '
      y = newHeight
    else
      line = testLine

  ctx.fillText(line, x, y, maxWidth)

###
# Loads image (given by an url) into canvas Image object
###
loadRemoteImage = (remote) ->
  deferred = do Q.defer
  request { url: remote, encoding: null}, (err, res, body) ->
    return deferred.reject err if err

    img = new Canvas.Image
    img.src = body

    deferred.resolve img
  deferred.promise

loadLocalImage = (path) ->
  deferred = do Q.defer
  fs.readFile path, (err, body) ->
    return deferred.reject err if err

    img = new Canvas.Image
    img.src = body

    deferred.resolve img
  deferred.promise


###
# Currently works only for square images
###
placeImage = (ctx, image, cx, cy, w, h, options = {type: 'square'}) ->
  ctx.fillStyle = ctx.createPattern image, "repeat"

  ctx.save()
  ctx.translate cx, cy

  zoom = 1

  switch options.type
    when 'square'
      ctx.beginPath()
      ctx.moveTo(-0.5 * w, -0.5 * w)
      ctx.lineTo( 0.5 * w, -0.5 * w)
      ctx.lineTo( 0.5 * w,  0.5 * w)
      ctx.lineTo(-0.5 * w,  0.5 * w)
      ctx.closePath()

      # This fill fit the picture into the area
      zoom = w / image.width

    when 'circle'
      ctx.beginPath()
      ctx.arc 0, 0, 0.5 * w, 0, 2 * Math.PI, false
      ctx.closePath()

      # This fill fit the picture into the area
      zoom = w / image.width

    when 'fitHeight'
      # This fill fit the picture into the area
      zoom = h / image.height

      w = image.width * zoom
      ctx.beginPath();
      ctx.moveTo(-0.5 * w, -0.5 * h)
      ctx.lineTo( 0.5 * w, -0.5 * h)
      ctx.lineTo( 0.5 * w,  0.5 * h)
      ctx.lineTo(-0.5 * w,  0.5 * h)
      ctx.closePath()



  ctx.scale(zoom, zoom)
  ctx.translate(-0.5 * image.width, -0.5 * image.height)

  ctx.fill()
  ctx.restore()



###
# Write canvas into specified file
###
writeCanvasToFile = (canvas, filename) ->
  deferred = do Q.defer

  canvas.pngStream().pipe(fs.createWriteStream filename)
  .on "close", ->
    deferred.resolve filename
  deferred.promise

###
#
###
uploadCanvasToStorage = (canvas) ->
  name = "render/#{uid 24}.png"
  uploader.fromStream canvas.pngStream(), name

###
# Main rendering function
###
renderLayout = (shot, source, avatar, banner) ->
  canvas = new Canvas P.width, P.height
  ctx = canvas.getContext "2d"

  _.each supportedFonts, (font) -> ctx.addFont font

  # Clearing the background
  ctx.fillStyle = P.backgroundColor
  ctx.fillRect 0, 0, P.width, P.height

  margin = P.width * P.margin
  placeImage(ctx, source, P.width * 0.5, P.width * 0.5, P.width - 2 * margin, P.width - 2 * margin)


  h = P.height - P.width
  w = P.width - 2 * margin

  mediaWidth  = w
  mediaHeight = h * P.media.height
  mediaPadding = P.media.padding * mediaWidth

  avatarWidth = mediaWidth * P.avatar.width


  do ctx.save

  # Draw avatar
  ctx.translate margin, P.width
  placeImage(ctx, avatar,
    0.5 * avatarWidth,
    0.5 * avatarWidth + mediaPadding,
    avatarWidth, avatarWidth, type: 'circle')

  # Draw title
  ctx.translate avatarWidth + P.avatar.margin * mediaWidth, 0

  ctx.textBaseline = "top"
  ctx.textAlign    = "left"

  titleSize = (P.width / P.fontUnit * P.title.size).toFixed(3)
  ctx.font         = "#{P.title.fontFace} #{titleSize}px #{P.title.font}"
  ctx.fillStyle    = P.title.color

  ctx.fillText "@#{shot.user.name}", 0, 0

  # Draw caption
  titleHeight = titleSize * (1 + P.title.padding)
  ctx.translate 0, titleHeight

  captionSize = (P.width / P.fontUnit * P.caption.size)
  ctx.font       = "#{P.caption.fontFace} #{captionSize.toFixed(3)}px #{P.caption.font}"
  ctx.fillStyle  = P.caption.color

  textWidth  = mediaWidth - (avatarWidth + P.avatar.margin * mediaWidth)
  textHeight = mediaHeight - 2 * mediaWidth * P.avatar.margin - titleHeight

  if shot.caption
    wrapText ctx, shot.caption, 0, 0, textWidth, textHeight, captionSize * P.caption.lineHeight

  do ctx.restore

  # Draw footer
  ctx.translate 0, P.width + mediaHeight
  footerHeight =  P.height - P.width - mediaHeight

  bannerHeight = footerHeight * (1 - 2 * P.footer.padding)
  placeImage ctx, banner, 0.5 * P.width, 0.5 * bannerHeight, 0, bannerHeight, type: 'fitHeight'

  uploadCanvasToStorage canvas


module.exports = render = (shot) ->
  # First, load all the images, then render
  Q.all([
    loadRemoteImage( uploader.makeUrl shot.image_standard )
    loadRemoteImage( uploader.makeUrl shot.user.avatar )
    loadLocalImage( path.resolve(path.join(__dirname, P.footer.banner)) )
  ]).then (images) ->
    renderLayout(shot, images[0], images[1], images[2])

