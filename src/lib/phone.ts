/**
 * Unified studio phone normalization utilities.
 * Handles domestic Israeli formats (05X-XXXXXXX), international E.164 (+972...),
 * Meta WhatsApp Cloud API wa_id digits, and database search candidates.
 */

/**
 * Normalizes any phone string to canonical E.164 format with leading '+'
 * (e.g. "052-811-4746" -> "+972528114746", "972528114746" -> "+972528114746").
 */
export function toCanonicalE164Phone(raw: string): string {
  const trimmed = raw.trim()
  const digits = trimmed.replace(/\D/g, '')
  if (digits.startsWith('972')) return `+${digits}`
  if (digits.startsWith('0') && digits.length >= 9) return `+972${digits.slice(1)}`
  if (trimmed.startsWith('+')) return `+${digits}`
  return `+${digits}`
}

/**
 * Normalizes phone for WhatsApp Cloud API sends (digits only, e.g. "972528114746").
 * Strips leading '+', hyphens, and converts domestic '05X' to '9725X'.
 */
export function normalizePhoneForWhatsApp(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('0')) {
    return `972${digits.slice(1)}`
  }
  return digits
}

/**
 * Normalizes incoming WhatsApp waId (e.g. "972501234567") to "+972501234567".
 */
export function normalizePhoneNumber(waId: string): string {
  return waId.startsWith('+') ? waId : `+${waId}`
}

/**
 * Generates search candidate variations across Israeli international (+972)
 * and domestic (05X) formats for flexible database customer matching.
 */
export function extractPhoneCandidates(raw: string): string[] {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return [raw.trim()]
  const candidates = new Set<string>()
  candidates.add(raw.trim())

  if (digits.startsWith('972')) {
    candidates.add(`+${digits}`)
    candidates.add(digits)
    const local = `0${digits.slice(3)}`
    candidates.add(local)
    if (local.length === 10) {
      candidates.add(`${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`)
      candidates.add(`${local.slice(0, 3)}-${local.slice(3)}`)
    }
  } else if (digits.startsWith('0')) {
    const intl = `972${digits.slice(1)}`
    candidates.add(`+${intl}`)
    candidates.add(intl)
    candidates.add(digits)
    if (digits.length === 10) {
      candidates.add(`${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`)
      candidates.add(`${digits.slice(0, 3)}-${digits.slice(3)}`)
    }
  } else {
    candidates.add(`+${digits}`)
    candidates.add(digits)
  }

  return Array.from(candidates)
}

/**
 * Normalizes any customer phone number to domestic Israeli display format
 * (e.g. "+972521113333" -> "0521113333", "972521113333" -> "0521113333", "052-111-3333" -> "0521113333").
 * Preserves foreign international numbers if not Israeli.
 */
export function formatPhoneForDisplay(raw?: string | null): string {
  if (!raw) return ''
  const trimmed = raw.trim()
  if (!trimmed) return ''

  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return trimmed

  if (digits.startsWith('972') && digits.length >= 11) {
    return `0${digits.slice(3)}`
  }
  if (digits.startsWith('0')) {
    return digits
  }
  if (trimmed.startsWith('+')) {
    return `+${digits}`
  }
  return digits
}

/**
 * Checks whether a phone number matches a search query bidirectionally.
 * Matches whether the query is local (052...), international (+972...),
 * digits-only (52111...), or formatted with hyphens.
 */
export function phoneMatchesQuery(phone: string | null | undefined, query: string): boolean {
  if (!phone || !query) return false
  const trimmedQ = query.trim().toLowerCase()
  if (!trimmedQ) return false

  const rawPhone = phone.toLowerCase()
  if (rawPhone.includes(trimmedQ)) return true

  const normalizedPhone = formatPhoneForDisplay(phone)
  if (normalizedPhone.includes(trimmedQ)) return true

  const canonicalPhone = toCanonicalE164Phone(phone).toLowerCase()
  if (canonicalPhone.includes(trimmedQ)) return true

  const qDigits = trimmedQ.replace(/\D/g, '')
  if (qDigits) {
    const rawDigits = phone.replace(/\D/g, '')
    const normDigits = normalizedPhone.replace(/\D/g, '')
    if (rawDigits.includes(qDigits) || normDigits.includes(qDigits)) return true
  }

  return false
}

