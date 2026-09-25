import { createFileRoute } from '@tanstack/react-router'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { requireAdmin } from '@/features/settings/server/helpers.server'

export async function handleBackupUpload(request: Request): Promise<Response> {
  try {
    await requireAdmin()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'לא מורשה'
    return new Response(JSON.stringify({ error: message }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return new Response(JSON.stringify({ error: 'חובה לשלוח בקשת multipart/form-data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof Blob)) {
      return new Response(JSON.stringify({ error: 'לא נבחר קובץ להעלאה' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const filename = (file as File).name || 'backup.zip'
    if (!filename.toLowerCase().endsWith('.zip')) {
      return new Response(JSON.stringify({ error: 'קובץ הגיבוי חייב להיות מסוג ZIP (.zip)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const su = await getSuperuserClient()
    const pbFormData = new FormData()
    pbFormData.append('file', file, filename)

    await su.backups.upload(pbFormData)

    return new Response(JSON.stringify({ ok: true, name: filename }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'העלאת קובץ הגיבוי נכשלה'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const Route = createFileRoute('/api/settings/backups/upload')({
  server: {
    handlers: {
      POST: ({ request }: { request: Request }) => handleBackupUpload(request),
    },
  },
})

