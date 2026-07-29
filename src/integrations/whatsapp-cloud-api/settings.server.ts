/**
 * Reads the singleton `settings` row's WhatsApp Cloud API credentials. Split out of
 * `conversations/server/webhook.ts` (which still re-exports it for existing callers) so the
 * AI agent orchestrator (`integrations/ai/agent.server.ts`) can read credentials without
 * importing `webhook.ts` — that import direction would otherwise create a cycle, since
 * `webhook.ts` calls into the agent after ingesting an inbound message.
 */
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import type PocketBase from 'pocketbase'

export interface WhatsAppSettings {
  id: string
  phoneNumberId: string
  accessToken: string
  verifyToken: string
  appSecret: string
}

export async function getWhatsAppSettings(su?: PocketBase): Promise<WhatsAppSettings | null> {
  const client = su ?? (await getSuperuserClient())
  const list = await client.collection('settings').getList(1, 1)
  const record = list.items[0]
  if (!record) return null
  const phoneNumberId = (record.whatsapp_phone_number_id as string | undefined) ?? ''
  const accessToken = (record.whatsapp_access_token as string | undefined) ?? ''
  const verifyToken = (record.whatsapp_webhook_verify_token as string | undefined) ?? ''
  const appSecret = (record.whatsapp_app_secret as string | undefined) ?? ''
  return { id: record.id, phoneNumberId, accessToken, verifyToken, appSecret }
}
