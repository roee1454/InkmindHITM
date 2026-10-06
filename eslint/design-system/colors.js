// Design system — colour, radius, shadow and raw-size guard rails. Every one of these was a real
// source of drift: 382 raw palette utilities, 28 arbitrary radii in 9 sizes, 5 hardcoded shadows
// (two of which baked in an accent colour that no longer exists).
// Messages start with `[ds:<pillar>]` so `pnpm ds:audit` can count them.

/** @type {import('./types.js').DesignSystemRules} */
export default {
  exempt: [
    'src/features/calendar/artist-colors.ts', // the one legitimately categorical palette
  ],
  syntax: [
    {
      selector:
        "Literal[value=/(?:^|\\s)(?:hover:|focus:|active:|group-hover:|dark:|disabled:|focus-visible:)*(?:bg|text|border|ring|from|to|via|decoration|outline|shadow|fill|stroke|accent|caret|divide|placeholder)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|[1-9]00|950)(?:\\/|\\s|$)/]",
      message:
        '[ds:colors] Raw Tailwind palette colour. Use a design system token: bg-card, text-muted-foreground, bg-accent-soft, text-accent-ink, text-status-{new,done,dead}, bg-artist-N, text-destructive.',
    },
    {
      selector: "Literal[value=/rounded(?:-[a-z]{1,2})?-\\[/]",
      message:
        '[ds:colors] Arbitrary radius. Use the roles: rounded-md (inset 8), rounded-lg (control 10), rounded-xl (card 12), rounded-full (pill).',
    },
    {
      selector: "Literal[value=/shadow-\\[/]",
      message:
        '[ds:colors] Arbitrary shadow. Use shadow-xs (raised) or shadow-lg (overlay); default is flat with a 1px border.',
    },
    {
      // Absolute px only — a relative `text-[0.85em]` inside prose is legitimate.
      selector: "Literal[value=/text-\\[\\d+(?:\\.\\d+)?px\\]/]",
      message:
        '[ds:colors] Arbitrary font size. Use a text role (IMText / IMHeading), not a size.',
    },
  ],
  imports: { paths: [], patterns: [] },
}
