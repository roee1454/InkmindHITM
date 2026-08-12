/// <reference path="../pb_data/types.d.ts" />

// Conversation HITL redesign: the price-quote block now carries a work duration and a price
// range (min–max) instead of a single exact price, and a new independent "slot confirm" gate
// lets staff sanity-check the bot-proposed date/time without touching `status` — reusing
// `status` here would let it silently satisfy `confirm_booking_final`'s `status === 'pending'`
// precondition early and let the bot lock a booking before payment.
migrate(
  (app) => {
    const appointments = app.findCollectionByNameOrId('pbc_1037645436')

    appointments.fields.add(
      new Field({ hidden: false, id: 'number_price_min_1', max: null, min: 0, name: 'price_min', onlyInt: false, presentable: false, required: false, system: false, type: 'number' }),
    )
    appointments.fields.add(
      new Field({ hidden: false, id: 'number_price_max_1', max: null, min: 0, name: 'price_max', onlyInt: false, presentable: false, required: false, system: false, type: 'number' }),
    )
    appointments.fields.add(
      new Field({ hidden: false, id: 'number_duration_minutes_1', max: 1440, min: 15, name: 'duration_minutes', onlyInt: true, presentable: false, required: false, system: false, type: 'number' }),
    )
    appointments.fields.add(
      new Field({ hidden: false, id: 'bool_slot_confirmed_1', name: 'slot_confirmed', presentable: false, required: false, system: false, type: 'bool' }),
    )
    app.save(appointments)

    // Backfill before removing the old fields — PocketBase doesn't derive new-field values
    // from old ones automatically.
    const rows = app.findRecordsByFilter('appointments', '', '', 0, 0)
    for (const record of rows) {
      const priceAmount = record.get('price_amount')
      if (priceAmount !== null && priceAmount !== undefined) {
        record.set('price_min', priceAmount)
        record.set('price_max', priceAmount)
      }
      const durationHours = record.get('duration_hours')
      record.set('duration_minutes', durationHours ? Math.round(durationHours * 60) : 120)
      const status = record.get('status')
      record.set('slot_confirmed', status === 'confirmed' || status === 'completed')
      app.save(record)
    }

    appointments.fields.removeById('number3275282450') // price_amount
    appointments.fields.removeById('number3606743025') // duration_hours
    return app.save(appointments)
  },
  (app) => {
    const appointments = app.findCollectionByNameOrId('pbc_1037645436')

    appointments.fields.add(
      new Field({ help: '', hidden: false, id: 'number3275282450', max: null, min: 0, name: 'price_amount', onlyInt: false, presentable: false, required: false, system: false, type: 'number' }),
    )
    appointments.fields.add(
      new Field({ help: '', hidden: false, id: 'number3606743025', max: 24, min: 0.5, name: 'duration_hours', onlyInt: false, presentable: false, required: false, system: false, type: 'number' }),
    )
    app.save(appointments)

    const rows = app.findRecordsByFilter('appointments', '', '', 0, 0)
    for (const record of rows) {
      const priceMax = record.get('price_max')
      const priceMin = record.get('price_min')
      const price = priceMax ?? priceMin
      if (price !== null && price !== undefined) record.set('price_amount', price)
      const durationMinutes = record.get('duration_minutes')
      record.set('duration_hours', durationMinutes ? durationMinutes / 60 : 2)
      app.save(record)
    }

    appointments.fields.removeById('number_price_min_1')
    appointments.fields.removeById('number_price_max_1')
    appointments.fields.removeById('number_duration_minutes_1')
    appointments.fields.removeById('bool_slot_confirmed_1')
    return app.save(appointments)
  },
)
