/// <reference path="../../pb_data/types.d.ts" />

// Shared logic for pb_hooks/conversation-preview.pb.js and the migration that backfills it.
// Covered by tests/integration/conversation-preview.test.ts.

const MAX_PREVIEW = 140

/** What the inbox shows for a message with no text. */
const MEDIA_LABELS = {
  image: 'תמונה',
  audio: 'הודעה קולית',
  video: 'סרטון',
  document: 'מסמך',
  sticker: 'מדבקה',
  location: 'מיקום',
}

/**
 * The inbox line for a message, or null when the message shouldn't replace the previous one: a staff
 * instruction to the bot (never sent to the customer) or a reaction.
 */
function previewOf(message) {
  if (message.getString('whatsapp_message_id').indexOf('internal_staff_') === 0) return null
  const type = message.getString('type')
  if (type === 'reaction') return null
  const body = message.getString('body').replace(/\s+/g, ' ').trim()
  const text = body || MEDIA_LABELS[type] || ''
  if (!text) return null
  return text.length > MAX_PREVIEW ? text.slice(0, MAX_PREVIEW - 1) + '…' : text
}

/** Writes the message's line onto its conversation. */
function applyPreview(app, message) {
  const preview = previewOf(message)
  const conversationId = message.getString('conversation')
  if (preview === null || !conversationId) return
  const conversation = app.findRecordById('conversations', conversationId)
  conversation.set('last_message_preview', preview)
  conversation.set('last_message_sender', message.getString('sender_type'))
  app.save(conversation)
}

module.exports = { previewOf, applyPreview }
