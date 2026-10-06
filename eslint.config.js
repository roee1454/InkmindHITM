//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'
import dsColors from './eslint/design-system/colors.js'
import dsComponents from './eslint/design-system/components.js'
import dsIcons from './eslint/design-system/icons.js'
import dsTypography from './eslint/design-system/typography.js'

// ESLint keeps only the last config of a rule, so the pillars are merged into one of each.
const designSystem = [dsColors, dsComponents, dsTypography, dsIcons]
const exempt = designSystem.flatMap((pillar) => pillar.exempt)

/** @param {{ insideUi: boolean }} where */
function designSystemRules({ insideUi }) {
  /** @template {{ outsideUi?: boolean }} T @param {T[]} entries */
  const keep = (entries) =>
    entries.filter((e) => !(insideUi && e.outsideUi)).map(({ outsideUi: _, ...rule }) => rule)
  return {
    'no-restricted-syntax': ['error', ...keep(designSystem.flatMap((p) => p.syntax))],
    'no-restricted-imports': [
      'error',
      {
        paths: keep(designSystem.flatMap((p) => p.imports.paths)),
        patterns: keep(designSystem.flatMap((p) => p.imports.patterns)),
      },
    ],
  }
}

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
    // Design system guard rails, one file per pillar under eslint/design-system/. The tokens are
    // only worth having if nothing can route around them. `pnpm ds:audit` counts what's left.
    files: ['src/**/*.{ts,tsx}'],
    ignores: [...exempt, 'src/components/ui/**'],
    rules: designSystemRules({ insideUi: false }),
  },
  {
    // ui/ is where the primitives are built from raw elements, so rules marked `outsideUi` skip it.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    ignores: exempt,
    rules: designSystemRules({ insideUi: true }),
  },
  {
    ignores: [
      'eslint.config.js',
      'eslint/**', // the design-system rule files themselves
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
