//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'
import dsColors from './eslint/design-system/colors.js'
import dsComponents from './eslint/design-system/components.js'
import dsIcons from './eslint/design-system/icons.js'
import dsTypography from './eslint/design-system/typography.js'

// ESLint keeps only the last config of a rule, so the pillars are merged into one of each.
const designSystem = [dsColors, dsComponents, dsTypography, dsIcons]

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
    ignores: designSystem.flatMap((pillar) => pillar.exempt),
    rules: {
      'no-restricted-syntax': ['error', ...designSystem.flatMap((pillar) => pillar.syntax)],
      'no-restricted-imports': [
        'error',
        {
          paths: designSystem.flatMap((pillar) => pillar.imports.paths),
          patterns: designSystem.flatMap((pillar) => pillar.imports.patterns),
        },
      ],
    },
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
