/// <reference path="../pb_data/types.d.ts" />

// Price-quote workflow: staff need to set a per-appointment deposit amount (not just the
// studio-wide default in settings) when quoting a price, and the AI agent needs a dedicated
// conversation state for the "customer confirmed payment, now double-check details before
// locking the booking in" step, per the studio's requested flow (staff verifies the receipt
// screenshot themselves — never the bot — then the bot asks the customer one last time before
// flipping the appointment to confirmed).
migrate(
  (app) => {
    const appointments = app.findCollectionByNameOrId('pbc_1037645436')
    if (!appointments.fields.getById('number_deposit_amount_1')) {
      appointments.fields.add(
        new Field({
          hidden: false,
          id: 'number_deposit_amount_1',
          max: null,
          min: 0,
          name: 'deposit_amount',
          onlyInt: false,
          presentable: false,
          required: false,
          system: false,
          type: 'number',
        }),
      )
    }
    app.save(appointments)

    const conversations = app.findCollectionByNameOrId('pbc_728114816')
    const stateField = conversations.fields.getById('select_conv_state_1')
    stateField.values = [
      'NEW',
      'COLLECTING_INFO',
      'AWAIT_PRICE_OFFER',
      'AWAIT_PAYMENT',
      'AWAIT_FINAL_CONFIRMATION',
      'AWAITING_APPOINTMENT',
      'AWAIT_NPS_SCORE',
      'COMPLETED',
    ]
    return app.save(conversations)
  },
  (app) => {
    const appointments = app.findCollectionByNameOrId('pbc_1037645436')
    appointments.fields.removeById('number_deposit_amount_1')
    app.save(appointments)

    const conversations = app.findCollectionByNameOrId('pbc_728114816')
    const stateField = conversations.fields.getById('select_conv_state_1')
    stateField.values = [
      'NEW',
      'COLLECTING_INFO',
      'AWAIT_PRICE_OFFER',
      'AWAIT_PAYMENT',
      'AWAITING_APPOINTMENT',
      'AWAIT_NPS_SCORE',
      'COMPLETED',
    ]
    return app.save(conversations)
  },
)
