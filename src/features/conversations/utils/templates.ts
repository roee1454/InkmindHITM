/**
 * Determines whether a WhatsApp message template should be excluded from the CRM
 * (e.g. Meta default sample templates, hello_world, or templates with en_US language).
 */
export function shouldExcludeTemplate(template: { name?: string; language?: string }): boolean {
  const lang = (template.language || '').toLowerCase().trim().replace('-', '_')
  // Exclude en_US templates (Meta default sample templates created automatically)
  if (lang === 'en_us' || lang.includes('en_us')) {
    return true
  }

  const name = (template.name || '').toLowerCase().trim()
  if (
    name.startsWith('sample_') ||
    name.startsWith('sample-') ||
    name === 'sample' ||
    name === 'hello_world' ||
    name.includes('_sample_')
  ) {
    return true
  }

  return false
}

/**
 * Backward-compatible helper for checking template exclusion.
 */
export function isMetaSampleTemplate(templateName: string, language?: string): boolean {
  return shouldExcludeTemplate({ name: templateName, language })
}
