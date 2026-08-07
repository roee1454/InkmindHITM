/// <reference path="../pb_data/types.d.ts" />

// Powers the closures redesign (Hebcal-imported "close forever" holidays + a recurring custom
// date, alongside genuine one-time closures) and the new availability wiring in
// src/features/settings/server/closures.ts's isStudioClosedOn — recurring closures match on
// month/day regardless of year; one-time closures match the exact stored date.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_4175197780') // studio_closures

    collection.fields.add(
      new Field({
        hidden: false,
        id: 'bool1785060020',
        name: 'is_recurring',
        presentable: false,
        required: false,
        system: false,
        type: 'bool',
      }),
    )
    collection.fields.add(
      new Field({
        autogeneratePattern: '',
        hidden: false,
        id: 'select1785060021',
        maxSelect: 1,
        name: 'source',
        presentable: false,
        required: false,
        system: false,
        type: 'select',
        values: ['manual', 'hebcal'],
      }),
    )

    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_4175197780')

    collection.fields.removeById('bool1785060020')
    collection.fields.removeById('select1785060021')

    return app.save(collection)
  },
)
