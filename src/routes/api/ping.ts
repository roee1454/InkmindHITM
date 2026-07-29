import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/ping')({
  server: {
    handlers: {
      GET: () => {
        return new Response('pong', { status: 200 })
      },
    },
  },
})
