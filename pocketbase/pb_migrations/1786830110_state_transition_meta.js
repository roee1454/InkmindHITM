/// <reference path="../pb_data/types.d.ts" />

// state_transitions.meta: details an event needs beyond from/to. First user: a rescheduled
// appointment (pb_hooks/lib/appointment-lifecycle.js) records the old and the new start time —
// needed for "how often do we reschedule, and who asks", and for judging a later cancellation
// against the date the service was actually set for.
migrate(
  (app) => {
    const transitions = app.findCollectionByNameOrId('state_transitions')
    if (!transitions.fields.getByName('meta')) {
      transitions.fields.add(new Field({ id: 'json_state_transitions_meta', name: 'meta', type: 'json', required: false, maxSize: 20000 }))
    }
    app.save(transitions)
  },
  (app) => {
    const transitions = app.findCollectionByNameOrId('state_transitions')
    transitions.fields.removeByName('meta')
    app.save(transitions)
  },
)
