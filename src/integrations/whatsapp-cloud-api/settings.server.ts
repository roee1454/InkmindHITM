/**
 * Reads the WhatsApp Cloud API credentials from environment variables — the only place they
 * are ever configured (see CLAUDE.md: secrets go through env vars, never the DB or a UI form).
 * Split out of `conversations/server/webhook.ts` (which still re-exports it for existing
 * callers) so the AI agent orchestrator (`integrations/ai/agent.server.ts`) can read
 * credentials without importing `webhook.ts` — that import direction would otherwise create a
 * cycle, since `webhook.ts` calls into the agent after ingesting an inbound message.
 */
export interface WhatsAppSettings {
  phoneNumberId: string
  accessToken: string
  verifyToken: string
  appSecret: string
}

export async function getWhatsAppSettings(): Promise<WhatsAppSettings | null> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? ''
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN ?? ''
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? ''
  const appSecret = process.env.WHATSAPP_APP_SECRET ?? ''
  if (!phoneNumberId && !accessToken && !verifyToken && !appSecret) return null
  return { phoneNumberId, accessToken, verifyToken, appSecret }
}
