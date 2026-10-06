/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const appointments = app.findCollectionByNameOrId('pbc_1037645436')

    if (!appointments.fields.getByName('reference_images')) {
      appointments.fields.add(
        new Field({
          hidden: false,
          id: 'json_ref_images_1',
          maxSize: 32768,
          name: 'reference_images',
          presentable: false,
          required: false,
          system: false,
          type: 'json',
        }),
      )
    }

    if (!appointments.fields.getByName('payment_receipt_url')) {
      appointments.fields.add(
        new Field({
          autogeneratePattern: '',
          hidden: false,
          id: 'text_receipt_url_1',
          max: 2000,
          min: 0,
          name: 'payment_receipt_url',
          pattern: '',
          presentable: false,
          primaryKey: false,
          required: false,
          system: false,
          type: 'text',
        }),
      )
    }

    app.save(appointments)
  },
  (app) => {
    const appointments = app.findCollectionByNameOrId('pbc_1037645436')
    const refField = appointments.fields.getByName('reference_images')
    if (refField) appointments.fields.removeById(refField.id)
    const receiptField = appointments.fields.getByName('payment_receipt_url')
    if (receiptField) appointments.fields.removeById(receiptField.id)
    app.save(appointments)
  },
)

