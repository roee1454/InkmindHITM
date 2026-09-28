import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getProjectPolicySettings, saveProjectPolicySettings } from '@/features/settings/server/settings'
import type { ProjectPolicySettings } from '@/lib/project-policy'

/** Form values as the inputs hold them: '' is "not decided yet". */
export type ProjectPolicyDraft = Record<keyof ProjectPolicySettings, string>

const QUERY_KEY = ['project-policy-settings']

function toDraft(settings: ProjectPolicySettings): ProjectPolicyDraft {
  const draft = {} as ProjectPolicyDraft
  for (const key of Object.keys(settings) as (keyof ProjectPolicySettings)[]) {
    const value = settings[key]
    draft[key] = value === null ? '' : String(value)
  }
  return draft
}

function numberOrNull(value: string): number | null {
  return value.trim() === '' ? null : Number(value)
}

function orNull<T extends string>(value: string): T | null {
  return value === '' ? null : (value as T)
}

function fromDraft(draft: ProjectPolicyDraft): ProjectPolicySettings {
  return {
    touchUpPolicy: orNull(draft.touchUpPolicy),
    // The free window's length only means something while the window itself is chosen.
    touchUpFreeDays: draft.touchUpPolicy === 'free_within_days' ? numberOrNull(draft.touchUpFreeDays) : null,
    depositApplication: orNull(draft.depositApplication),
    depositPerSession: orNull(draft.depositPerSession),
    healingPeriodDays: numberOrNull(draft.healingPeriodDays),
    consultationFollowupDays: numberOrNull(draft.consultationFollowupDays),
    consultationLostAfterDays: numberOrNull(draft.consultationLostAfterDays),
    inquiryLostAfterDays: numberOrNull(draft.inquiryLostAfterDays),
    dormantAfterMonths: numberOrNull(draft.dormantAfterMonths),
    postProjectFeedback: orNull(draft.postProjectFeedback),
    easyReviewLink: draft.easyReviewLink.trim() || null,
  }
}

export function useProjectPolicyForm() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: QUERY_KEY, queryFn: () => getProjectPolicySettings() })
  const [draft, setDraft] = useState<ProjectPolicyDraft | null>(null)

  useEffect(() => {
    if (query.data) setDraft(toDraft(query.data))
  }, [query.data])

  const save = useMutation({
    mutationFn: (values: ProjectPolicyDraft) => saveProjectPolicySettings({ data: fromDraft(values) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  const initial = query.data ? toDraft(query.data) : null
  const isDirty = draft !== null && initial !== null && JSON.stringify(draft) !== JSON.stringify(initial)

  function setField(key: keyof ProjectPolicyDraft, value: string) {
    setDraft((current) => (current ? { ...current, [key]: value } : current))
  }

  function reset() {
    if (query.data) setDraft(toDraft(query.data))
  }

  return { query, draft, setField, isDirty, save, reset }
}
