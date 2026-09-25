/// <reference path="../pb_data/types.d.ts" />

// Adds invitation fields to `staff` collection:
// 1. `invite_token` (text, nullable)
// 2. `invite_token_expires_at` (date, nullable)
// 3. `invite_accepted_at` (date, nullable)
migrate(
  (app) => {
    const staff = app.findCollectionByNameOrId('staff')

    staff.fields.add(
      new Field({
        autogeneratePattern: '',
        hidden: false,
        id: 'text_staff_invite_token',
        max: 128,
        min: 0,
        name: 'invite_token',
        pattern: '',
        presentable: false,
        primaryKey: false,
        required: false,
        system: false,
        type: 'text',
      }),
    )

    staff.fields.add(
      new Field({
        hidden: false,
        id: 'date_staff_invite_token_expires_at',
        max: '',
        min: '',
        name: 'invite_token_expires_at',
        presentable: false,
        required: false,
        system: false,
        type: 'date',
      }),
    )

    staff.fields.add(
      new Field({
        hidden: false,
        id: 'date_staff_invite_accepted_at',
        max: '',
        min: '',
        name: 'invite_accepted_at',
        presentable: false,
        required: false,
        system: false,
        type: 'date',
      }),
    )

    app.save(staff)
    return null
  },
  (app) => {
    const staff = app.findCollectionByNameOrId('staff')
    staff.fields.removeById('text_staff_invite_token')
    staff.fields.removeById('date_staff_invite_token_expires_at')
    staff.fields.removeById('date_staff_invite_accepted_at')
    app.save(staff)
    return null
  },
)

