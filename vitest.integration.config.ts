import { defineConfig } from 'vitest/config'
import path from 'node:path'

/**
 * Integration suite: runs against a real, throwaway PocketBase (schema from pb_migrations, rules
 * from pb_hooks) started by the global setup. Kept out of `pnpm test` because it needs the
 * PocketBase binary and takes a few seconds to boot. Run with `pnpm test:integration`.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '#': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/integration/**/*.test.ts'],
    globalSetup: ['tests/integration/setup/pocketbase.global-setup.ts'],
    setupFiles: ['tests/integration/setup/env.setup.ts'],
    // One PocketBase instance is shared by every file; tests isolate by creating their own records.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
})
