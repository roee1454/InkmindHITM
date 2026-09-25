/// <reference path="../pb_data/types.d.ts" />

// The app ships one theme now, so the studio no longer picks a palette. Light/dark became a
// per-device preference (localStorage, see `src/hooks/use-theme.ts`) rather than a studio-wide
// setting — two artists sharing one studio record should not fight over it.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_2769025244') // settings

    collection.fields.removeById('text1785060007') // ui_theme
    collection.fields.removeById('bool_ui_dark_mode_1') // ui_dark_mode

    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_2769025244')

    collection.fields.add(
      new Field({
        autogeneratePattern: '',
        hidden: false,
        id: 'text1785060007',
        max: 32,
        min: 0,
        name: 'ui_theme',
        pattern: '',
        presentable: false,
        primaryKey: false,
        required: false,
        system: false,
        type: 'text',
      }),
    )

    collection.fields.add(
      new Field({
        hidden: false,
        id: 'bool_ui_dark_mode_1',
        name: 'ui_dark_mode',
        presentable: false,
        required: false,
        system: false,
        type: 'bool',
      }),
    )

    return app.save(collection)
  },
)
