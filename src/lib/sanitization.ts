/**
 * Sanitization and validation helpers for client input and prompt safety.
 */

// Allowed: Hebrew letters, Latin letters, spaces, hyphens, and single-quote/apostrophe.
const CLIENT_NAME_REGEX = /^[a-zA-Z\u0590-\u05FF\s'\-–—]+$/

/**
 * Sanitizes and validates a client's full name.
 * - Strips script/style tags and their inner content
 * - Strips all HTML/XML tags
 * - Strips control and zero-width characters
 * - Normalizes whitespace
 * - Enforces allowed character set (Hebrew, English, spaces, hyphens, apostrophes)
 * - Enforces length between 2 and 50 characters
 * 
 * Returns the cleaned name, or null if the name is invalid.
 */
export function sanitizeClientName(rawName: unknown): string | null {
  if (typeof rawName !== 'string') return null

  // 1. Strip script and style tags along with their inner contents
  let cleaned = rawName.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')

  // 2. Strip any remaining HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, '')

  // 3. Strip zero-width and control characters
  // eslint-disable-next-line no-control-regex
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF\x00-\x1F\x7F]/g, '')

  // 4. Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim()

  // 5. Validate length
  if (cleaned.length < 2 || cleaned.length > 50) {
    return null
  }

  // 6. Validate character set
  if (!CLIENT_NAME_REGEX.test(cleaned)) {
    return null
  }

  return cleaned
}

// Regex to strip bracketed blocks containing system or role instructions
const BRACKETED_INJECTION_REGEX = /[[{<][^\]}>]*(?:system|assistant|instruction|מערכת|הוראה|אישור|צוות)[^\]}>]*[\]}>]/giu

// Regex to strip role / system prefixes
const INJECTION_PREFIXES_REGEX = /(?:^|[^\p{L}\p{N}])(?:system|assistant|instruction|הוראת מערכת|מערכת|הוראה|אישור מנהל|אישור צוות)\s*:/giu

/**
 * Sanitizes user-provided text before inserting into system prompts or logs.
 * - Strips script and style tags along with content
 * - Strips bracketed system/instruction blocks entirely
 * - Strips remaining bracket delimiters used by prompt engineering ([ ], { }, < >)
 * - Strips system/instruction prefixes
 * - Flattens newlines to single spaces to prevent multi-line prompt spoofing
 * - Truncates to max length
 */
export function sanitizePromptText(rawText: unknown, maxLength = 300): string {
  if (typeof rawText !== 'string') return ''

  // 1. Strip script and style tags with content
  let cleaned = rawText.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')

  // 2. Strip bracketed blocks containing system or role instructions
  cleaned = cleaned.replace(BRACKETED_INJECTION_REGEX, '')

  // 3. Strip any remaining HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, '')

  // 4. Strip prompt delimiter brackets
  cleaned = cleaned.replace(/[[\]{}<>]/g, '')

  // 5. Strip injection prefixes
  cleaned = cleaned.replace(INJECTION_PREFIXES_REGEX, '')

  // 6. Flatten newlines and multiple whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim()

  // 7. Truncate
  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength).trim()
  }

  return cleaned
}

