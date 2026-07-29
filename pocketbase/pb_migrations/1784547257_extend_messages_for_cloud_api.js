/// <reference path="../pb_data/types.d.ts" />

// Phase 1 (WhatsApp Cloud API foundation): the `messages.type` select only covered the
// subset of message types the AI phase would emit. Cloud API webhooks can deliver more
// inbound types (video, location, sticker, contacts), so widen the enum. Also add
// `reply_to_wamid` (the WhatsApp context.message_id a message replies to) and
// `error_detail` (Graph's errors[] text on a failed send) so staff can see why a send
// failed. Written to be idempotent — safe to run even if the same delta was already
// applied live against a running dev instance via the PATCH API.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_2605467279')

    const typeField = collection.fields.getById('select2363381545')
    typeField.values = [
      'text',
      'image',
      'audio',
      'document',
      'template',
      'interactive',
      'video',
      'location',
      'sticker',
      'contacts',
    ]

    if (!collection.fields.getById('text2900100001')) {
      collection.fields.add(
        new Field({
          autogeneratePattern: '',
          hidden: false,
          id: 'text2900100001',
          max: 200,
          min: 0,
          name: 'reply_to_wamid',
          pattern: '',
          presentable: false,
          primaryKey: false,
          required: false,
          system: false,
          type: 'text',
        }),
      )
    }

    if (!collection.fields.getById('text2900100002')) {
      collection.fields.add(
        new Field({
          autogeneratePattern: '',
          hidden: false,
          id: 'text2900100002',
          max: 2000,
          min: 0,
          name: 'error_detail',
          pattern: '',
          presentable: false,
          primaryKey: false,
          required: false,
          system: false,
          type: 'text',
        }),
      )
    }

    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_2605467279')

    const typeField = collection.fields.getById('select2363381545')
    typeField.values = ['text', 'image', 'audio', 'document', 'template', 'interactive']

    collection.fields.removeById('text2900100001')
    collection.fields.removeById('text2900100002')

    return app.save(collection)
  },
)
