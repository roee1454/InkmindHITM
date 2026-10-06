import { createFileRoute } from '@tanstack/react-router'
import {
  healthDeclarationInputSchema,
  isValidHealthWebhookSecret,
  processHealthDeclaration,
} from '@/features/health-declaration/server/health-service'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'

export async function handleHealthDeclarationWebhook(request: Request): Promise<Response> {
  const secretHeader =
    request.headers.get('x-webhook-secret') ||
    request.headers.get('x-health-webhook-secret') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    null

  if (!isValidHealthWebhookSecret(secretHeader)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized: Invalid or missing webhook secret' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  let body: unknown
  try {
    body = await request.json()
    console.log('[health-declaration-webhook] Received raw submission:', JSON.stringify(body, null, 2))
  } catch {
    return new Response(JSON.stringify({ error: 'Bad Request: Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const parsed = healthDeclarationInputSchema.safeParse(body)
  if (!parsed.success) {
    console.warn('[health-declaration-webhook] Validation failed:', parsed.error.format())
    return new Response(
      JSON.stringify({
        error: 'Validation failed',
        details: parsed.error.format(),
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  try {
    const su = await getSuperuserClient()
    const result = await processHealthDeclaration(su, parsed.data)
    console.log(
      '[health-declaration-webhook] Processed successfully for customer:',
      result.customer.id,
      'name:',
      result.customer.name,
      'stateTransitioned:',
      result.stateTransitioned,
    )
    return new Response(
      JSON.stringify({
        ok: true,
        customerId: result.customer.id,
        appointmentId: result.appointment?.id || null,
        conversationId: result.conversation?.id || null,
        stateTransitioned: result.stateTransitioned,
        messageDelivery: result.messageDelivery,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (err) {
    console.error('[health-declaration-webhook] Error processing submission:', err)
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}

export const Route = createFileRoute('/api/health-declaration/webhook')({
  server: {
    handlers: {
      GET: () => {
        return new Response(
          JSON.stringify({ status: 'ok', service: 'health-declaration-webhook' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      },
      POST: ({ request }: { request: Request }) => handleHealthDeclarationWebhook(request),
    },
  },
})

