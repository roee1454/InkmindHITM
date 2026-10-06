/// <reference path="../../pb_data/types.d.ts" />

// Shared logic for pb_hooks/appointment-lifecycle.pb.js. Covered by
// tests/integration/appointment-lifecycle.test.ts.

const CANCELLED_BY_ACTOR = { customer: 'customer', bot: 'customer', staff: 'studio', system: 'system' }

function pbNow() {
  return new Date().toISOString().replace('T', ' ')
}

/**
 * Stamps the dates a status change implies and appends it to state_transitions. `status_actor` and
 * `status_reason` are consumed here (cleared on the record), so each change carries only the
 * attribution its own writer supplied. Changes with no attribution (the admin UI, a caller that
 * wasn't updated) are still logged, with an empty actor. Returns that attribution, so the project
 * stage it may move (./project-stage.js) is logged with the same actor and reason.
 */
/**
 * A moved appointment is an event, not a status: it stays pending/confirmed, and the log keeps the
 * old and the new time with whoever moved it. Idle until state_transitions has `meta` (older
 * migrations run with today's hooks when an old database is upgraded).
 */
function recordReschedule(app, record, original, attribution) {
  if (!original) return
  const before = original.getString('start_time')
  const after = record.getString('start_time')
  if (!before || !after || before === after) return
  const transitions = app.findCollectionByNameOrId('state_transitions')
  if (!transitions.fields.getByName('meta')) return

  const log = new Record(transitions)
  log.set('entity', 'appointments')
  log.set('entity_id', record.id)
  log.set('from', original.getString('status'))
  log.set('to', record.getString('status'))
  log.set('actor', attribution.actor)
  log.set('reason', attribution.reason ? `rescheduled:${attribution.reason}` : 'rescheduled')
  log.set('meta', { from_start: before, to_start: after })
  app.save(log)
}

function recordStatusChange(app, record, original) {
  const from = original ? original.getString('status') : ''
  const to = record.getString('status')
  const actor = record.getString('status_actor')
  const reason = record.getString('status_reason')
  record.set('status_actor', '')
  record.set('status_reason', '')
  const attribution = { actor: actor, reason: reason }
  recordReschedule(app, record, original, attribution)
  if (from === to) return attribution

  const now = pbNow()
  record.set('status_changed_at', now)
  if (to === 'confirmed' && !record.getString('confirmed_at')) record.set('confirmed_at', now)
  if (to === 'completed') record.set('completed_at', now)
  if (to === 'cancelled') {
    record.set('cancelled_at', now)
    if (!record.getString('cancelled_by') && CANCELLED_BY_ACTOR[actor]) record.set('cancelled_by', CANCELLED_BY_ACTOR[actor])
  } else if (from === 'cancelled') {
    // Reinstated: the cancellation facts no longer describe the appointment.
    record.set('cancelled_at', '')
    record.set('cancelled_by', '')
  }

  const log = new Record(app.findCollectionByNameOrId('state_transitions'))
  log.set('entity', 'appointments')
  log.set('entity_id', record.id)
  log.set('from', from)
  log.set('to', to)
  log.set('actor', actor)
  log.set('reason', reason)
  app.save(log)
  return attribution
}

module.exports = { recordStatusChange }
