/// <reference path="../pb_data/types.d.ts" />

// `conversations.state` has existed since the initial schema but was never written to or read
// by any code — reserved for the AI agent's per-conversation FSM state (ported from the WAHA
// prototype's session.state). Converting it from freeform text to a select enum here, before
// any real rows use it, gets DB-level validation for free (a typo'd state string would
// otherwise silently break tool-gating logic with no error). Safe to convert in place since
// the field has never held real data — no backfill needed.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_728114816')

    collection.fields.removeById('text2744374011')
    collection.fields.add(
      new Field({
        hidden: false,
        id: 'select_conv_state_1',
        maxSelect: 1,
        name: 'state',
        presentable: false,
        required: false,
        system: false,
        type: 'select',
        values: [
          'NEW',
          'COLLECTING_INFO',
          'AWAIT_PRICE_OFFER',
          'AWAIT_PAYMENT',
          'AWAITING_APPOINTMENT',
          'AWAIT_NPS_SCORE',
          'COMPLETED',
        ],
      }),
    )

    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_728114816')

    collection.fields.removeById('select_conv_state_1')
    collection.fields.add(
      new Field({
        help: '',
        hidden: false,
        id: 'text2744374011',
        max: 100,
        min: 0,
        name: 'state',
        pattern: '',
        presentable: false,
        primaryKey: false,
        required: false,
        system: false,
        type: 'text',
      }),
    )

    return app.save(collection)
  },
)
