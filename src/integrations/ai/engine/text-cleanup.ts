/**
 * Normalizes punctuation in bot output to prevent excessive marks:
 * 1. Collapses duplicate exclamation marks while preserving single ! for warmth
 * 2. Removes em/en dashes and isolated hyphens (without adding unwanted commas)
 * 3. Preserves hyphens after Hebrew prepositions before numbers (e.g. ב-16:00, כ-45, ה-20.9)
 *    while removing unnatural hyphens before Hebrew words (e.g. ב-ראשון -> בראשון)
 * 4. Removes robotic commas before 'ו' or 'או'
 * 5. Removes greeting commas/periods (e.g. "היי, " -> "היי ")
 * 6. Collapses duplicate punctuation and whitespace
 */
export function cleanBotPunctuation(text: string): string {
  return text
    .replace(/!{2,}/g, '!')
    .replace(/\.{2,}/g, '.')
    .replace(/,{2,}/g, ',')
    .replace(/,\s*\./g, '.')
    .replace(/\.\s*,/g, '.')
    .replace(/\s*[—–]\s*/g, ' ')
    .replace(/\s+-\s+/g, ' ')
    .replace(/(?<![א-ת])([בהלכמ])-([א-ת]+)/g, '$1$2')
    .replace(/,\s*(ו[א-ת]+|או)(?![א-ת])/g, ' $1')
    .replace(/^(היי|שלום|אוקיי|הבנתי)[,\.]\s*/g, '$1 ')
    .replace(/[^\S\r\n]{2,}/g, ' ')
    .trim()
}
