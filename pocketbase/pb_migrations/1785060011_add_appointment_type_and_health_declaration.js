/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const appointments = app.findCollectionByNameOrId('pbc_1037645436')

    if (!appointments.fields.getByName('type')) {
      appointments.fields.add(
        new Field({
          hidden: false,
          id: 'select_apt_type_1',
          maxSelect: 1,
          name: 'type',
          presentable: false,
          required: false,
          system: false,
          type: 'select',
          values: ['tattoo', 'sketch'],
        }),
      )
      app.save(appointments)

      const rows = app.findRecordsByFilter('appointments', '', '', 0, 0)
      for (const record of rows) {
        if (!record.get('type')) {
          record.set('type', 'tattoo')
          app.save(record)
        }
      }
    }
  },
  (app) => {
    const appointments = app.findCollectionByNameOrId('pbc_1037645436')
    const field = appointments.fields.getByName('type')
    if (field) {
      appointments.fields.removeById(field.id)
      app.save(appointments)
    }
  },
)

