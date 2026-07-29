//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
    },
  },
  {
    ignores: [
      'eslint.config.js',
      'prettier.config.js',
      'src/components/ui/**', // shadcn-generated primitives, not hand-edited
      'pocketbase/**', // Pocketbase's own Go migrations + MCP server, not part of the app
      '.claude/**', // Claude Code skills/config, not part of the app
    ],
  },
]
