import { createServerFn } from '@tanstack/react-start'
import {
  WhatsAppApiError,
  createWhatsAppClient,
} from '@/integrations/whatsapp-cloud-api/client'
import { getWhatsAppSettings } from '@/integrations/whatsapp-cloud-api/settings.server'
import { requireAdmin } from './helpers.server'
import { logWhatsAppError } from './whatsapp-error-log'

/**
 * WhatsApp credentials are configured exclusively via environment variables (see CLAUDE.md) —
 * this tab is read-only diagnostics: what's configured, and a live connection test. There is
 * no write path here on purpose.
 */
export interface WhatsAppSettingsForm {
  phoneNumberId: string
  businessAccountId: string
  verifyToken: string
  hasAccessToken: boolean
  hasAppSecret: boolean
  hasPhoneNumberId: boolean
  hasBusinessAccountId: boolean
  hasVerifyToken: boolean
}

export const getWhatsAppSettingsForm = createServerFn({ method: 'GET' }).handler(
  async (): Promise<WhatsAppSettingsForm> => {
    await requireAdmin()
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? ''
    const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ?? ''
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? ''
    return {
      phoneNumberId,
      businessAccountId,
      verifyToken,
      hasAccessToken: Boolean(process.env.WHATSAPP_ACCESS_TOKEN),
      hasAppSecret: Boolean(process.env.WHATSAPP_APP_SECRET),
      hasPhoneNumberId: Boolean(phoneNumberId),
      hasBusinessAccountId: Boolean(businessAccountId),
      hasVerifyToken: Boolean(verifyToken),
    }
  },
)

export interface TestConnectionResult {
  displayPhoneNumber: string
  verifiedName: string
}

export const testWhatsAppConnection = createServerFn({ method: 'POST' }).handler(
  async (): Promise<TestConnectionResult> => {
    await requireAdmin()
    const settings = await getWhatsAppSettings()
    if (!settings?.phoneNumberId || !settings.accessToken) {
      const message = 'חסרים משתני הסביבה WHATSAPP_PHONE_NUMBER_ID או WHATSAPP_ACCESS_TOKEN.'
      await logWhatsAppError('test_connection', message)
      throw new Error(message)
    }

    const client = createWhatsAppClient({
      phoneNumberId: settings.phoneNumberId,
      accessToken: settings.accessToken,
    })
    try {
      const info = await client.getPhoneNumberInfo()
      return { displayPhoneNumber: info.displayPhoneNumber, verifiedName: info.verifiedName }
    } catch (err) {
      const message =
        err instanceof WhatsAppApiError
          ? `בדיקת החיבור נכשלה (${err.httpStatus}): ${err.message}`
          : 'בדיקת החיבור נכשלה.'
      await logWhatsAppError('test_connection', message)
      throw new Error(message)
    }
  },
)

export { getWhatsAppErrorLog } from './whatsapp-error-log'
