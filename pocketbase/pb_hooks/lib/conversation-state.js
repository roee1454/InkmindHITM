/// <reference path="../../pb_data/types.d.ts" />

// Shared logic for pb_hooks/conversation-state.pb.js. Covered by
// tests/integration/conversation-state.test.ts.

const CONVERSATION_STATE_UNATTRIBUTED = 'integrity:conversation_state_unattributed'

/** Idle until the attribution fields exist: older migrations run with today's hooks on upgrade. */
function attributionTracked(app) {
  return !!app.findCollectionByNameOrId('conversations').fields.getByName('state_actor')
}

function changeOf(record, original) {
  const from = original ? original.getString('state') : ''
  const to = record.getString('state')
  if (from === to) return null
  // A conversation created in NEW is simply first contact.
  if (!original && (to === '' || to === 'NEW')) return null
  return { from: from, to: to }
}

/**
 * Every change of a conversation's dialogue state must come with `state_actor` / `state_reason`
 * (set by transition() in the Node server). A write without them bypasses the state machine and is
 * rejected. Runs before the write (onRecordCreate/onRecordUpdate) so the code reaches the caller:
 * PocketBase replaces the message of an error thrown later in a create with a generic one.
 */
function assertAttributed(app, record, original) {
  if (!attributionTracked(app)) return
  if (changeOf(record, original) && !record.getString('state_actor')) {
    throw new BadRequestError(CONVERSATION_STATE_UNATTRIBUTED)
  }
}

/** Inside the write's transaction: logs the change in state_transitions and consumes the attribution. */
function recordStateChange(app, record, original) {
  if (!attributionTracked(app)) return
  const actor = record.getString('state_actor')
  const reason = record.getString('state_reason')
  record.set('state_actor', '')
  record.set('state_reason', '')
  const change = changeOf(record, original)
  if (!change) return

  const log = new Record(app.findCollectionByNameOrId('state_transitions'))
  log.set('entity', 'conversations')
  log.set('entity_id', record.id)
  log.set('from', change.from)
  log.set('to', change.to)
  log.set('actor', actor)
  log.set('reason', reason)
  app.save(log)
}

module.exports = { CONVERSATION_STATE_UNATTRIBUTED, assertAttributed, recordStateChange }
