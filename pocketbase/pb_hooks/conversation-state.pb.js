/// <reference path="../pb_data/types.d.ts" />

// One writer for the conversation state machine (logic in ./lib/conversation-state.js): a state
// change without attribution is rejected, whoever writes it — CRM code, MCP, the admin UI — and
// every change is logged in state_transitions inside the same transaction.

onRecordCreate((e) => {
  const conversationState = require(`${__hooks}/lib/conversation-state.js`)
  conversationState.assertAttributed(e.app, e.record, null)
  e.next()
}, 'conversations')

onRecordUpdate((e) => {
  const conversationState = require(`${__hooks}/lib/conversation-state.js`)
  conversationState.assertAttributed(e.app, e.record, e.record.original())
  e.next()
}, 'conversations')

onRecordCreateExecute((e) => {
  const conversationState = require(`${__hooks}/lib/conversation-state.js`)
  conversationState.recordStateChange(e.app, e.record, null)
  e.next()
}, 'conversations')

onRecordUpdateExecute((e) => {
  const conversationState = require(`${__hooks}/lib/conversation-state.js`)
  conversationState.recordStateChange(e.app, e.record, e.record.original())
  e.next()
}, 'conversations')
