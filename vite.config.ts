import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import react from '@vitejs/plugin-react'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

export default defineConfig(({ command, mode }) => {
  const isDev = command === 'serve' && mode === 'development'

  return {
    resolve: { tsconfigPaths: true },
    server: {
      // Vite blocks requests from unknown Host headers; allow ngrok's tunnel domains so
      // Meta's webhook (and local tunnel testing) reach the dev server. Dev-only.
      allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app', '.ngrok.app', '.ngrok.io'],
    },
    plugins: [
      isDev && devtools(),
      tailwindcss(),
      tanstackStart(),
      isDev && react(),
      nitro(),
    ].filter(Boolean),
  }
})
