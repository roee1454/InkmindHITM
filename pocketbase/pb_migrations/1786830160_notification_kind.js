/// <reference path="../pb_data/types.d.ts" />
// Notifications split into two kinds: `system` (appointments, escalations, sync errors…) and
// `whatsapp_message` (a customer wrote in). The notifications screen shows them as two tabs; a
// message notification's title is now just the sender, since the tab already says what it is.
// Existing message notifications are recognised by the title the webhook used to write.
const PREFIX = 'הודעה חדשה מ-'

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('notifications')
    collection.fields.add(
      new Field({
        id: 'select_notification_kind',
        name: 'kind',
        type: 'select',
        required: false,
        maxSelect: 1,
        values: ['system', 'whatsapp_message'],
      }),
    )
    app.save(collection)

    for (const record of app.findAllRecords('notifications')) {
      const title = record.getString('title')
      if (title.startsWith(PREFIX)) {
        record.set('kind', 'whatsapp_message')
        record.set('title', title.slice(PREFIX.length) || title)
      } else {
        record.set('kind', 'system')
      }
      app.save(record)
    }
  },
  (app) => {
    for (const record of app.findAllRecords('notifications')) {
      if (record.getString('kind') === 'whatsapp_message') {
        record.set('title', PREFIX + record.getString('title'))
        app.save(record)
      }
    }
    const collection = app.findCollectionByNameOrId('notifications')
    collection.fields.removeById('select_notification_kind')
    app.save(collection)
  },
)
