import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { requireAdmin } from './helpers.server'

export type WhatsAppErrorSource = 'webhook_signature' | 'webhook_processing' | 'test_connection'

/** Best-effort: a logging failure must never break the webhook/test-connection flow it's
 *  logging. `createServerOnlyFn` keeps this out of the client bundle even though this module
 *  is also imported (for `getWhatsAppErrorLog`) from the client-rendered diagnostics component. */
export const logWhatsAppError = createServerOnlyFn(
  async (source: WhatsAppErrorSource, message: string): Promise<void> => {
    try {
      const su = await getSuperuserClient()
      await su.collection('whatsapp_error_log').create({ source, message: message.slice(0, 2000) })
    } catch (err) {
      console.error('[whatsapp-error-log] failed to persist error log entry', err)
    }
  },
)

export interface WhatsAppErrorLogEntry {
  id: string
  source: WhatsAppErrorSource
  message: string
  created: string
}

export const getWhatsAppErrorLog = createServerFn({ method: 'GET' }).handler(
  async (): Promise<WhatsAppErrorLogEntry[]> => {
    await requireAdmin()
    const su = await getSuperuserClient()
    const list = await su.collection('whatsapp_error_log').getList(1, 20, { sort: '-created' })
    return list.items.map((item) => ({
      id: item.id,
      source: item.source as WhatsAppErrorSource,
      message: item.message as string,
      created: item.created as string,
    }))
  },
)
