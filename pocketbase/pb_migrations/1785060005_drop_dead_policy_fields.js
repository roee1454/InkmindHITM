/// <reference path="../pb_data/types.d.ts" />

// Two dead settings fields: `staff_notification_phone` (confirmed never read by any
// message-sending code — the real staff-notification path, notifyStaff() in tools.server.ts,
// only ever creates an in-app dashboard notification) and `default_session_duration_hours`
// (confirmed never read by any booking/availability code — the AI's tools and manual booking
// both use their own independent defaults). Both were UI fields that saved/redisplayed but were
// never actually consulted anywhere. Dropping rather than leaving unused parallel config paths.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_2769025244') // settings

    collection.fields.removeById('text3376415723') // staff_notification_phone
    collection.fields.removeById('number389621445') // default_session_duration_hours

    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_2769025244')

    collection.fields.add(
      new Field({
        autogeneratePattern: '',
        hidden: false,
        id: 'text3376415723',
        max: 32,
        min: 0,
        name: 'staff_notification_phone',
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
        id: 'number389621445',
        max: null,
        min: 0.5,
        name: 'default_session_duration_hours',
        onlyInt: false,
        presentable: false,
        required: false,
        system: false,
        type: 'number',
      }),
    )

    return app.save(collection)
  },
)
