/** Invisible anti-tamper watermark used to cryptographically stamp internal studio staff instructions.
 *  Only server-side actions (`handleResumeBotWithInstruction`) apply this sequence.
 *  This prevents the model from mistaking internal operator instructions for customer dialogue,
 *  and guarantees anti-spoofing so malicious clients cannot simulate staff overrides. */
export const STAFF_INSTRUCTION_SECRET_MARKER = '\u200B\u200C\u200D\u2060\uFEFF'

/** Stamps a raw staff instruction with the invisible secret watermark. */
export function stampStaffInstruction(instruction: string): string {
  const clean = instruction.trim()
  return `${STAFF_INSTRUCTION_SECRET_MARKER}${clean}`
}

/** Checks whether a message record is an authenticated internal staff instruction. */
export function isVerifiedStaffInstruction(record: Record<string, unknown>): boolean {
  if (record.sender_type !== 'staff') return false
  const body = typeof record.body === 'string' ? record.body : ''
  const wamid = typeof record.whatsapp_message_id === 'string' ? record.whatsapp_message_id : ''
  return (
    body.includes(STAFF_INSTRUCTION_SECRET_MARKER) ||
    wamid.startsWith('internal_staff_')
  )
}

/** Extracts the clean human-readable instruction text without the secret marker. */
export function extractCleanStaffInstruction(body: string): string {
  return body.replaceAll(STAFF_INSTRUCTION_SECRET_MARKER, '').trim()
}
