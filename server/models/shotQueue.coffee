# Utilities
{ config, log, sms } = require "../utils"

return if config.get('env') is 'testing'

queue = require "../services/queue/jobs"

module.exports = (cb) ->
  @status = "queued"
  @save (err, item) =>
    job = queue.create "print",
      title : "Shot ##{@_id}"
      id : @_id
    .save ->
      cb "hello"

    job.on "failed", (err) =>
      sms
        to   : config.get 'sms:toNumber'
        body : "Леша, фото @#{@user.name} не напечаталось!"
      @status = "failed"
      @save (err) =>
        log.warn "Shot ##{@_id} marked as failed"

    job.on "complete", =>
      @status = "printed"
      @save =>
        log.info "Shot ##{@_id} marked as complete"
