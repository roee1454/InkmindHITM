import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireAuth, requireAdmin, getSettingsRecord } from './helpers.server'
import { generateAiReply } from '@/integrations/ai/client.server'

export interface AiSettings {
  aiEnabled: boolean
  aiConfig: {
    model: string
    temperature: number
    maxTokens: number | null
  }
  systemInstructions: string
}

export const getAiSettings = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AiSettings> => {
    await requireAuth()
    const { record } = await getSettingsRecord()
    return {
      aiEnabled: Boolean(record?.ai_enabled),
      aiConfig: {
        model: (record?.ai_model as string) || 'claude-sonnet-5',
        temperature: (record?.ai_temperature as number) ?? 0.4,
        maxTokens: (record?.ai_max_tokens as number) ?? null,
      },
      systemInstructions: (record?.ai_system_instructions as string) || '',
    }
  },
)

const toggleAiSchema = z.object({
  enabled: z.boolean(),
})

export const toggleAiEnabled = createServerFn({ method: 'POST' })
  .validator(toggleAiSchema)
  .handler(async ({ data }) => {
    await requireAdmin()
    const { su, record } = await getSettingsRecord()
    if (!record) throw new Error('רשומת ההגדרות חסרה.')
    await su.collection('settings').update(record.id, {
      ai_enabled: data.enabled,
    })
    return { ok: true, enabled: data.enabled }
  })

const saveAiConfigSchema = z.object({
  model: z.string().trim().min(1),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().nullable().optional(),
})

export const saveAiConfig = createServerFn({ method: 'POST' })
  .validator(saveAiConfigSchema)
  .handler(async ({ data }) => {
    await requireAdmin()
    const { su, record } = await getSettingsRecord()
    if (!record) throw new Error('רשומת ההגדרות חסרה.')
    await su.collection('settings').update(record.id, {
      ai_model: data.model,
      ai_temperature: data.temperature,
      ai_max_tokens: data.maxTokens,
    })
    return { ok: true }
  })

const saveAiInstructionsSchema = z.object({
  instructions: z.string().trim(),
})

export const saveAiInstructions = createServerFn({ method: 'POST' })
  .validator(saveAiInstructionsSchema)
  .handler(async ({ data }) => {
    await requireAdmin()
    const { su, record } = await getSettingsRecord()
    if (!record) throw new Error('רשומת ההגדרות חסרה.')
    await su.collection('settings').update(record.id, {
      ai_system_instructions: data.instructions,
    })
    return { ok: true }
  })

export interface TestAiConnectionResult {
  sample: string
}

const testAiConnectionSchema = z.object({
  model: z.string().trim().min(1),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().nullable().optional(),
})

/** Validates the OpenAI integration with a cheap live call. Uses the in-progress form values
 *  when present (so you can test before saving), else the stored ones — mirrors
 *  `testWhatsAppConnection`'s shape in `./whatsapp`. */
export const testAiConnection = createServerFn({ method: 'POST' })
  .validator(testAiConnectionSchema)
  .handler(async ({ data }): Promise<TestAiConnectionResult> => {
    await requireAdmin()
    const { record } = await getSettingsRecord()

    const model = data.model || (record?.ai_model as string) || ''
    if (!model) throw new Error('לא נבחר מודל.')

    try {
      const result = await generateAiReply({
        model,
        systemInstructions: '',
        temperature: data.temperature,
        maxTokens: data.maxTokens ?? null,
        prompt: 'ענה במילה אחת בלבד: תקין',
      })
      return { sample: result.text.trim() }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`בדיקת החיבור נכשלה: ${message}`)
    }
  })
