queue  = require "../services/queue/jobs"

# Utilities
{ config, log } = require "../utils"

module.exports = (cb) ->
  @status = "queued"
  @save (err, item) =>
    job = queue.create "print", 
      title : "Shot ##{@_id}"
      id : @_id
    .save ->
      cb "hello"

    job.on "failed", =>
      @status = "failed"
      @save (err) =>
        log.warn "Shot ##{@_id} marked as failed"

    job.on "complete", =>
      @status = "printed"
      @save =>
        log.info "Shot ##{@_id} marked as complete"
