import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  WhatsAppApiError,
  createWhatsAppClient,
} from '@/integrations/whatsapp-cloud-api/client'
import { requireAdmin, getSettingsRecord } from './helpers.server'

export interface WhatsAppSettingsForm {
  studioName: string
  phoneNumberId: string
  businessAccountId: string
  verifyToken: string
  hasAccessToken: boolean
  hasAppSecret: boolean
}

export const getWhatsAppSettingsForm = createServerFn({ method: 'GET' }).handler(
  async (): Promise<WhatsAppSettingsForm> => {
    await requireAdmin()
    const { record } = await getSettingsRecord()
    return {
      studioName: (record?.studio_name as string) || '',
      phoneNumberId: (record?.whatsapp_phone_number_id as string) || '',
      businessAccountId: (record?.whatsapp_business_account_id as string) || '',
      verifyToken: (record?.whatsapp_webhook_verify_token as string) || '',
      hasAccessToken: Boolean(record?.whatsapp_access_token),
      hasAppSecret: Boolean(record?.whatsapp_app_secret),
    }
  },
)

const saveSchema = z.object({
  phoneNumberId: z.string().trim().max(64).default(''),
  businessAccountId: z.string().trim().max(64).default(''),
  verifyToken: z.string().trim().max(200).default(''),
  accessToken: z.string().trim().optional(),
  appSecret: z.string().trim().optional(),
})

export const saveWhatsAppSettings = createServerFn({ method: 'POST' })
  .validator(saveSchema)
  .handler(async ({ data }) => {
    await requireAdmin()
    const { su, record } = await getSettingsRecord()
    if (!record) throw new Error('רשומת ההגדרות חסרה. יש להשלים תחילה את תהליך ההקמה.')

    const payload: Record<string, unknown> = {
      whatsapp_phone_number_id: data.phoneNumberId,
      whatsapp_business_account_id: data.businessAccountId,
      whatsapp_webhook_verify_token: data.verifyToken,
    }
    if (data.accessToken) payload.whatsapp_access_token = data.accessToken
    if (data.appSecret) payload.whatsapp_app_secret = data.appSecret

    await su.collection('settings').update(record.id, payload)
    return { ok: true }
  })

export interface TestConnectionResult {
  displayPhoneNumber: string
  verifiedName: string
}

const testSchema = z.object({
  phoneNumberId: z.string().trim().optional(),
  accessToken: z.string().trim().optional(),
})

export const testWhatsAppConnection = createServerFn({ method: 'POST' })
  .validator(testSchema)
  .handler(async ({ data }): Promise<TestConnectionResult> => {
    await requireAdmin()
    const { record } = await getSettingsRecord()

    const phoneNumberId = data.phoneNumberId || (record?.whatsapp_phone_number_id as string) || ''
    const accessToken = data.accessToken || (record?.whatsapp_access_token as string) || ''
    if (!phoneNumberId || !accessToken) {
      throw new Error('חסרים מזהה מספר טלפון או טוקן גישה.')
    }

    const client = createWhatsAppClient({ phoneNumberId, accessToken })
    try {
      const info = await client.getPhoneNumberInfo()
      return { displayPhoneNumber: info.displayPhoneNumber, verifiedName: info.verifiedName }
    } catch (err) {
      if (err instanceof WhatsAppApiError) {
        throw new Error(`בדיקת החיבור נכשלה (${err.httpStatus}): ${err.message}`)
      }
      throw new Error('בדיקת החיבור נכשלה.')
    }
  })
