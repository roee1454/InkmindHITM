import { configDefaults, defineConfig } from 'vitest/config'
import path from 'node:path'

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
    // Needs a real PocketBase — run separately with `pnpm test:integration`.
    exclude: [...configDefaults.exclude, 'tests/integration/**'],
  },
})
