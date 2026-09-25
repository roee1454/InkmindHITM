/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const settings = app.findCollectionByNameOrId('pbc_2769025244')

    if (!settings.fields.getByName('health_declaration_form_url')) {
      settings.fields.add(
        new Field({
          autogeneratePattern: '',
          hidden: false,
          id: 'text_health_declaration_form_url',
          max: 2000,
          min: 0,
          name: 'health_declaration_form_url',
          pattern: '',
          presentable: false,
          primaryKey: false,
          required: false,
          system: false,
          type: 'text',
        }),
      )
    }

    if (!settings.fields.getByName('health_declaration_validity_months')) {
      settings.fields.add(
        new Field({
          hidden: false,
          id: 'num_health_declaration_validity_months',
          name: 'health_declaration_validity_months',
          presentable: false,
          required: false,
          system: false,
          type: 'number',
        }),
      )
    }

    return app.save(settings)
  },
  (app) => {
    const settings = app.findCollectionByNameOrId('pbc_2769025244')

    settings.fields.removeByName('health_declaration_form_url')
    settings.fields.removeByName('health_declaration_validity_months')

    return app.save(settings)
  },
)

