/// <reference path="../pb_data/types.d.ts" />

// The conversation state machine gets the same single-writer rule appointments have
// (pb_hooks/conversation-state.pb.js): a change of `state` must say who made it and why, through
// these transient fields, and every change is logged in state_transitions. A write that skips
// src/features/conversations/server/state-machine.ts's transition() now fails loudly.
const CONVERSATIONS = 'pbc_728114816'

const FIELDS = [
  { id: 'select_conv_state_actor', name: 'state_actor', type: 'select', maxSelect: 1, values: ['bot', 'staff', 'system', 'customer'] },
  { id: 'text_conv_state_reason', name: 'state_reason', type: 'text', max: 200 },
]

migrate(
  (app) => {
    const conversations = app.findCollectionByNameOrId(CONVERSATIONS)
    for (const field of FIELDS) {
      if (!conversations.fields.getByName(field.name)) conversations.fields.add(new Field({ required: false, ...field }))
    }
    app.save(conversations)
  },
  (app) => {
    const conversations = app.findCollectionByNameOrId(CONVERSATIONS)
    for (const field of FIELDS) conversations.fields.removeByName(field.name)
    app.save(conversations)
  },
)
