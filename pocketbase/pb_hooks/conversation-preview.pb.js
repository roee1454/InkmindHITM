/// <reference path="../pb_data/types.d.ts" />

// The inbox shows each conversation's last message. Every writer of `messages` (the webhook, the
// bot, staff, the MCP assistant, templates) goes through here, so none of them has to remember it.
// Logic in ./lib/conversation-preview.js; covered by tests/integration/conversation-preview.test.ts.

onRecordAfterCreateSuccess((e) => {
  const preview = require(`${__hooks}/lib/conversation-preview.js`)
  try {
    preview.applyPreview(e.app, e.record)
  } catch (err) {
    // A missing preview must never fail the message itself; the next message rewrites it.
    e.app.logger().warn('conversation preview not updated', 'message', e.record.id, 'error', String(err))
  }
  e.next()
}, 'messages')
