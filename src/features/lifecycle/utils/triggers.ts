/**
 * What the lifecycle has already sent, recorded so nothing goes out twice: per appointment
 * (appointments.lifecycle_sent) or per project (projects.lifecycle_sent).
 */
export type LifecycleTrigger = 'reminder_3d' | 'reminder_1d' | 'healing_check'
export type ProjectLifecycleTrigger = 'feedback' | 'consultation_followup'

export function triggerSent(lifecycleSent: unknown, trigger: string): boolean {
  const sent = Array.isArray(lifecycleSent) ? lifecycleSent : []
  return sent.some((item: unknown) => {
    if (typeof item === 'string') return item === trigger
    if (item && typeof item === 'object' && 'trigger' in item) return (item as { trigger: string }).trigger === trigger
    return false
  })
}

export function withTriggerSent(lifecycleSent: unknown, trigger: string, nowIso: string): unknown[] {
  return [...(Array.isArray(lifecycleSent) ? lifecycleSent : []), { trigger, sent_at: nowIso }]
}
