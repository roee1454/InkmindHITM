import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireAuth, requireAdmin, getSettingsRecord } from './helpers.server'
import { generateAiReply } from '@/integrations/ai/model/generate-once.server'
import { SYSTEM_AI_MODEL, SYSTEM_AI_MAX_TOKENS } from '@/integrations/ai/model/defaults'
import { getStudioAgentRuntimeConfig } from '@/integrations/ai/studio-config.server'

export interface AiSettings {
  aiEnabled: boolean
  aiConfig: {
    model: string
    temperature: number
    maxTokens: number | null
  }
  systemInstructions: string
}

export interface ActiveAgentPoliciesSummary {
  studioName: string
  healthDeclaration: {
    formUrl: string | null
    validityMonths: number
    validityText: string
    isConfigured: boolean
  }
  cancellation: {
    cutoffHours: number
    summaryText: string
  }
  deposit: {
    required: boolean
    defaultAmount: number | null
    hasInstructions: boolean
    paymentInstructions: string | null
  }
  reviewLink: string | null
  ironRules: {
    count: number
    customInstructions: string | null
  }
}

export const getActiveAgentPolicies = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ActiveAgentPoliciesSummary> => {
    await requireAuth()
    const { su } = await getSettingsRecord()
    const config = await getStudioAgentRuntimeConfig(su)

    const rules = config.ironRules.customInstructions
      ? config.ironRules.customInstructions
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
      : []

    return {
      studioName: config.studio.name,
      healthDeclaration: {
        formUrl: config.healthDeclaration.formUrl,
        validityMonths: config.healthDeclaration.validityMonths,
        validityText: config.healthDeclaration.validitySummaryHebrew,
        isConfigured: Boolean(config.healthDeclaration.formUrl),
      },
      cancellation: {
        cutoffHours: config.cancellation.cutoffHours,
        summaryText: config.cancellation.summaryHebrew,
      },
      deposit: {
        required: config.deposit.required,
        defaultAmount: config.deposit.defaultAmount,
        hasInstructions: Boolean(config.deposit.paymentInstructions),
        paymentInstructions: config.deposit.paymentInstructions,
      },
      reviewLink: config.reviewLink,
      ironRules: {
        count: rules.length,
        customInstructions: config.ironRules.customInstructions,
      },
    }
  },
)

export const getAiSettings = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AiSettings> => {
    await requireAuth()
    const { record } = await getSettingsRecord()
    return {
      aiEnabled: Boolean(record?.ai_enabled),
      aiConfig: {
        model: SYSTEM_AI_MODEL,
        temperature: (record?.ai_temperature as number) ?? 0.4,
        maxTokens: SYSTEM_AI_MAX_TOKENS,
      },
      systemInstructions: (record?.ai_system_instructions as string) || '',
    }
  },
)

export const toggleAiSchema = z.object({
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

export const saveAiConfigSchema = z.object({
  model: z.string().trim().optional(),
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
      ai_model: SYSTEM_AI_MODEL,
      ai_temperature: data.temperature,
      ai_max_tokens: data.maxTokens,
    })
    return { ok: true }
  })

export const saveAiInstructionsSchema = z.object({
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
  model: z.string().trim().optional(),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().nullable().optional(),
})

/** Validates the AI integration with a cheap live call using the hardcoded system model. */
export const testAiConnection = createServerFn({ method: 'POST' })
  .validator(testAiConnectionSchema)
  .handler(async ({ data }): Promise<TestAiConnectionResult> => {
    await requireAdmin()

    try {
      const result = await generateAiReply({
        model: SYSTEM_AI_MODEL,
        systemInstructions: '',
        temperature: data.temperature,
        maxTokens: data.maxTokens ?? SYSTEM_AI_MAX_TOKENS,
        prompt: 'ענה במילה אחת בלבד: תקין',
      })
      return { sample: result.text.trim() }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`בדיקת החיבור נכשלה: ${message}`)
    }
  })
