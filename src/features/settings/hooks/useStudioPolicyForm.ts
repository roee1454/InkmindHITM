import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getStudioPolicySettings, saveStudioPolicySettings } from '@/features/settings/server/settings'
import type { StudioPolicySettings } from '@/features/settings/server/settings'

/** The studio policy fields as their inputs hold them. */
export interface StudioPolicyDraft {
  paymentInstructions: string
  reviewLink: string
  cancellationCutoffHours: string
  healthDeclarationFormUrl: string
  healthDeclarationValidityMonths: string
}

const QUERY_KEY = ['studio-policy-settings']

function toDraft(settings: StudioPolicySettings): StudioPolicyDraft {
  return {
    paymentInstructions: settings.paymentInstructions ?? '',
    reviewLink: settings.reviewLink ?? '',
    cancellationCutoffHours: String(settings.cancellationCutoffHours ?? 48),
    healthDeclarationFormUrl: settings.healthDeclarationFormUrl ?? '',
    healthDeclarationValidityMonths: String(settings.healthDeclarationValidityMonths ?? 6),
  }
}

/** Payments, cancellations, the health declaration and the Google review link — the policy the bot quotes. */
export function useStudioPolicyForm() {
  const queryClient = useQueryClient()
  const query = useQuery<StudioPolicySettings>({ queryKey: QUERY_KEY, queryFn: () => getStudioPolicySettings() })
  const [draft, setDraft] = useState<StudioPolicyDraft | null>(null)

  useEffect(() => {
    if (query.data) setDraft(toDraft(query.data))
  }, [query.data])

  const save = useMutation({
    mutationFn: (values: StudioPolicyDraft) =>
      saveStudioPolicySettings({
        data: {
          paymentInstructions: values.paymentInstructions,
          reviewLink: values.reviewLink,
          cancellationCutoffHours: Number(values.cancellationCutoffHours),
          healthDeclarationFormUrl: values.healthDeclarationFormUrl,
          healthDeclarationValidityMonths: Number(values.healthDeclarationValidityMonths),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })

  const initial = query.data ? toDraft(query.data) : null
  const isDirty = draft !== null && initial !== null && JSON.stringify(draft) !== JSON.stringify(initial)

  function setField(key: keyof StudioPolicyDraft, value: string) {
    setDraft((current) => (current ? { ...current, [key]: value } : current))
  }

  function reset() {
    if (query.data) setDraft(toDraft(query.data))
  }

  return { query, draft, setField, isDirty, save, reset }
}
