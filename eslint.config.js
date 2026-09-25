//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    rules: {
      '@typescript-eslint/no-unnecessary-condition': 'off',
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/naming-convention': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'pnpm/json-enforce-catalog': 'off',
    },
  },
  {
    // Design system guard rails. Every one of these was a real source of drift: 382 raw
    // palette utilities, 28 arbitrary radii in 9 sizes, 5 hardcoded shadows (two of which
    // baked in an accent colour that no longer exists), and 100 icons imported from 83
    // files. The tokens are only worth having if nothing can route around them.
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/features/calendar/artist-colors.ts', // the one legitimately categorical palette
      'src/components/ui/icon.tsx', // the only module allowed to name an icon library
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "Literal[value=/(?:^|\\s)(?:hover:|focus:|active:|group-hover:|dark:|disabled:|focus-visible:)*(?:bg|text|border|ring|from|to|via|decoration|outline|shadow|fill|stroke|accent|caret|divide|placeholder)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|[1-9]00|950)(?:\\/|\\s|$)/]",
          message:
            'Raw Tailwind palette colour. Use a design system token: bg-card, text-muted-foreground, bg-accent-soft, text-accent-ink, text-status-{new,done,dead}, bg-artist-N, text-destructive.',
        },
        {
          selector: "Literal[value=/rounded(?:-[a-z]{1,2})?-\\[/]",
          message:
            'Arbitrary radius. Use the roles: rounded-md (inset 8), rounded-lg (control 10), rounded-xl (card 12), rounded-full (pill).',
        },
        {
          selector: "Literal[value=/shadow-\\[/]",
          message:
            'Arbitrary shadow. Use shadow-xs (raised) or shadow-lg (overlay); default is flat with a 1px border.',
        },
        {
          // Absolute px only — a relative `text-[0.85em]` inside prose is legitimate.
          selector: "Literal[value=/text-\\[\\d+(?:\\.\\d+)?px\\]/]",
          message:
            'Arbitrary font size. Use the scale: text-2xs, text-xs, text-sm, text-base, text-lg, text-xl, text-2xl, text-3xl (or text-micro/text-mini for dense chrome).',
        },
        {
          selector: "ImportDeclaration[source.value='lucide-react']",
          message:
            "Import icons from '@/components/ui/icon' — it is the only module that may name an icon library.",
        },
      ],
    },
  },
  {
    ignores: [
      'eslint.config.js',
      'prettier.config.js',
      'src/components/ui/**', // shadcn-generated primitives, not hand-edited
      'pocketbase/**', // Pocketbase's own Go migrations + MCP server, not part of the app
      '.claude/**',
      '.agents/**', // Claude Code skills/config, not part of the app
      '.output/**',
      'public/sw.js',
      'scripts/**',
      'tests/integration/setup/hooks/**', // PocketBase JSVM hooks, like pocketbase/**
    ],
  },
]
