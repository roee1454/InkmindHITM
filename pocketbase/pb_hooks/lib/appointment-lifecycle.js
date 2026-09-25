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
 * wasn't updated) are still logged, with an empty actor.
 */
function recordStatusChange(app, record, original) {
  const from = original ? original.getString('status') : ''
  const to = record.getString('status')
  const actor = record.getString('status_actor')
  const reason = record.getString('status_reason')
  record.set('status_actor', '')
  record.set('status_reason', '')
  if (from === to) return

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
}

module.exports = { recordStatusChange }
