/// <reference path="../pb_data/types.d.ts" />
// The inbox line of each conversation: its last message (text, or what kind of media it was) and
// who sent it. Kept up to date by pb_hooks/conversation-preview.pb.js; filled here for what exists.
// The line is computed as in pb_hooks/lib/conversation-preview.js, copied so this migration stays
// what it was when it ran.
const MEDIA_LABELS = { image: 'תמונה', audio: 'הודעה קולית', video: 'סרטון', document: 'מסמך', sticker: 'מדבקה', location: 'מיקום' }

function previewOf(message) {
  if (message.getString('whatsapp_message_id').indexOf('internal_staff_') === 0) return null
  const type = message.getString('type')
  if (type === 'reaction') return null
  const text = message.getString('body').replace(/\s+/g, ' ').trim() || MEDIA_LABELS[type] || ''
  if (!text) return null
  return text.length > 140 ? text.slice(0, 139) + '…' : text
}

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('conversations')
    collection.fields.add(
      new Field({ id: 'text_last_message_preview', name: 'last_message_preview', type: 'text', required: false, max: 200 }),
    )
    collection.fields.add(
      new Field({
        id: 'select_last_message_sender',
        name: 'last_message_sender',
        type: 'select',
        required: false,
        maxSelect: 1,
        values: ['customer', 'ai_bot', 'staff'],
      }),
    )
    app.save(collection)

    for (const conversation of app.findAllRecords('conversations')) {
      // Newest first; the first message that has a line is the one the inbox shows.
      const messages = app.findRecordsByFilter('messages', 'conversation = {:id}', '-timestamp', 20, 0, { id: conversation.id })
      for (const message of messages) {
        const line = previewOf(message)
        if (line === null) continue
        conversation.set('last_message_preview', line)
        conversation.set('last_message_sender', message.getString('sender_type'))
        app.save(conversation)
        break
      }
    }
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('conversations')
    collection.fields.removeById('text_last_message_preview')
    collection.fields.removeById('select_last_message_sender')
    app.save(collection)
  },
)
