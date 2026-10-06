/// <reference path="../pb_data/types.d.ts" />

// Lead Stage 1:1 FSM Synchronization:
// The CRM leads stages now map 1:1 to the agent engine's 11 ConversationState values.
// This replaces the coarse-grained legacy enum ('new', 'intake', 'awaiting_price', 'awaiting_payment', 'booked', 'expired')
// with the exact engine states.
migrate(
  (app) => {
    // Backfill existing customer lead_stage based on active conversation state or defaults
    const customers = app.findRecordsByFilter('customers', '', '', 0, 0)
    for (const record of customers) {
      try {
        const conv = app.findFirstRecordByFilter('conversations', `customer = "${record.id}"`)
        const state = conv?.get('state')
        if (state) {
          record.set('lead_stage', state)
        } else {
          record.set('lead_stage', 'NEW')
        }
      } catch {
        record.set('lead_stage', 'NEW')
      }
      app.save(record)
    }

    const collection = app.findCollectionByNameOrId('customers')
    const stageField = collection.fields.getById('select2761645798')
    stageField.values = [
      'NEW',
      'WANTS_TO_BOOK',
      'COLLECTING_INFO',
      'WAITLIST',
      'AWAIT_PRICE_OFFER',
      'AWAIT_HEALTH_NOTICE',
      'AWAIT_PAYMENT',
      'AWAIT_FINAL_CONFIRMATION',
      'AWAITING_APPOINTMENT',
      'AWAIT_NPS_SCORE',
      'COMPLETED',
    ]

    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('customers')
    const stageField = collection.fields.getById('select2761645798')
    stageField.values = ['new', 'intake', 'awaiting_price', 'awaiting_payment', 'booked', 'expired']
    return app.save(collection)
  },
)

