import { createFileRoute } from '@tanstack/react-router'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { requireAdmin } from '@/features/settings/server/helpers.server'

/**
 * Streams a PocketBase backup file to the browser without ever exposing PocketBase itself
 * (which stays loopback-only in production — see docker-compose.yml). Gated by the CRM's own
 * session (`requireAdmin`, same as the Backup Now / delete actions in BackupSettingsTab), then
 * mints a short-lived PocketBase file token server-side and proxies the bytes through.
 */
export async function handleBackupDownload(key: string): Promise<Response> {
  try {
    await requireAdmin()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'לא מורשה'
    return new Response(message, { status: 403 })
  }

  const su = await getSuperuserClient()
  const fileToken = await su.files.getToken()
  const downloadUrl = su.backups.getDownloadURL(fileToken, key)

  const pbResponse = await fetch(downloadUrl)
  if (!pbResponse.ok || !pbResponse.body) {
    return new Response('גיבוי לא נמצא', { status: 404 })
  }

  return new Response(pbResponse.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${key}"`,
      ...(pbResponse.headers.get('content-length')
        ? { 'Content-Length': pbResponse.headers.get('content-length')! }
        : {}),
    },
  })
}

export const Route = createFileRoute('/api/settings/backups/$key/download')({
  server: {
    handlers: {
      GET: ({ params }: { params: { key: string } }) => handleBackupDownload(params.key),
    },
  },
})
