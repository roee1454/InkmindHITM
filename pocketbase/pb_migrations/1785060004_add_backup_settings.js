/// <reference path="../pb_data/types.d.ts" />

// Configurable backup schedule/behavior, editable from the CRM's own Settings screen
// (src/features/settings/components/BackupSettingsTab.tsx) — read by
// pocketbase/scripts/backup.sh, which is invoked hourly by an OS-level crontab entry that
// itself never needs to change; the script decides whether it's actually time to back up
// based on these fields.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_2769025244') // settings

    collection.fields.add(
      new Field({
        id: 'bool1785060010',
        name: 'backup_enabled',
        type: 'bool',
        hidden: false,
        presentable: false,
        required: false,
        system: false,
      }),
    )
    collection.fields.add(
      new Field({
        id: 'number1785060011',
        name: 'backup_interval_hours',
        type: 'number',
        hidden: false,
        presentable: false,
        required: false,
        system: false,
        min: 1,
        max: null,
        onlyInt: true,
      }),
    )
    collection.fields.add(
      new Field({
        id: 'number1785060012',
        name: 'backup_retention_count',
        type: 'number',
        hidden: false,
        presentable: false,
        required: false,
        system: false,
        min: 1,
        max: null,
        onlyInt: true,
      }),
    )
    collection.fields.add(
      new Field({
        id: 'date1785060013',
        name: 'last_backup_at',
        type: 'date',
        hidden: false,
        presentable: false,
        required: false,
        system: false,
      }),
    )
    collection.fields.add(
      new Field({
        id: 'bool1785060014',
        name: 'last_backup_ok',
        type: 'bool',
        hidden: false,
        presentable: false,
        required: false,
        system: false,
      }),
    )
    collection.fields.add(
      new Field({
        id: 'text1785060015',
        name: 'last_backup_error',
        type: 'text',
        hidden: false,
        presentable: false,
        required: false,
        system: false,
        autogeneratePattern: '',
        pattern: '',
        primaryKey: false,
        max: 2000,
        min: 0,
      }),
    )

    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_2769025244')

    collection.fields.removeById('bool1785060010')
    collection.fields.removeById('number1785060011')
    collection.fields.removeById('number1785060012')
    collection.fields.removeById('date1785060013')
    collection.fields.removeById('bool1785060014')
    collection.fields.removeById('text1785060015')

    return app.save(collection)
  },
)
