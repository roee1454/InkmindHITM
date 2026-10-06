import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Check, Copy, Activity, AlertTriangle, CheckCircle2 } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SettingsRow, SettingsSection } from '@/features/settings/components/settings-layout'
import { getWhatsAppSettingsForm, testWhatsAppConnection, getWhatsAppErrorLog } from '@/features/settings/server/settings'

const SOURCE_LABELS: Record<string, string> = {
  webhook_signature: 'חתימת Webhook',
  webhook_processing: 'עיבוד הודעה נכנסת',
  test_connection: 'בדיקת חיבור',
  conversation_turn_queue: 'תור עיבוד שיחות',
}

/**
 * Read-only WhatsApp Cloud API diagnostics — env var status, identifiers to copy, a connection test
 * and the recent error log. Credentials are only ever configured via environment variables (see
 * CLAUDE.md); there is no write path here on purpose.
 */
export function WhatsAppDiagnostics() {
  const settingsQuery = useQuery({
    queryKey: ['whatsapp-settings-form'],
    queryFn: () => getWhatsAppSettingsForm(),
  })

  const errorLogQuery = useQuery({
    queryKey: ['whatsapp-error-log'],
    queryFn: () => getWhatsAppErrorLog(),
  })

  const webhookUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/api/whatsapp-webhook` : ''

  const testMutation = useMutation({
    mutationFn: () => testWhatsAppConnection(),
  })

  const s = settingsQuery.data
  const env = [
    { name: 'WHATSAPP_PHONE_NUMBER_ID', ok: s?.hasPhoneNumberId },
    { name: 'WHATSAPP_BUSINESS_ACCOUNT_ID', ok: s?.hasBusinessAccountId },
    { name: 'WHATSAPP_WEBHOOK_VERIFY_TOKEN', ok: s?.hasVerifyToken },
    { name: 'WHATSAPP_ACCESS_TOKEN', ok: s?.hasAccessToken },
    { name: 'WHATSAPP_APP_SECRET', ok: s?.hasAppSecret },
  ]
  const missing = env.filter((e) => !e.ok).length
  const errors = errorLogQuery.data ?? []

  return (
    <>
      <SettingsSection title="WhatsApp" description="החיבור ל-WhatsApp Cloud API מוגדר במשתני סביבה בשרת, לא כאן. מכאן בודקים אותו.">
        <SettingsRow
          label="משתני סביבה"
          hint={settingsQuery.isLoading ? 'בודק…' : missing === 0 ? 'כל חמשת המשתנים מוגדרים.' : `חסרים ${missing} מתוך ${env.length}.`}
          stacked={missing > 0}
        >
          {!settingsQuery.isLoading && (
            <ul className="flex flex-col gap-1.5">
              {env.map((e) => (
                <EnvVarRow key={e.name} name={e.name} configured={e.ok ?? false} />
              ))}
            </ul>
          )}
        </SettingsRow>
        <SettingsRow label="Phone Number ID">
          <ReadOnlyCopyInput value={s?.phoneNumberId ?? ''} placeholder="לא מוגדר" label="Phone Number ID" />
        </SettingsRow>
        <SettingsRow label="Business Account ID">
          <ReadOnlyCopyInput value={s?.businessAccountId ?? ''} placeholder="לא מוגדר" label="Business Account ID" />
        </SettingsRow>
        <SettingsRow label="כתובת ה-Webhook" hint="מעתיקים ללוח הבקרה של Meta.">
          <ReadOnlyCopyInput value={webhookUrl} placeholder="http://..." label="כתובת ה-Webhook" />
        </SettingsRow>
        <SettingsRow
          label="בדיקת חיבור"
          hint={
            testMutation.isSuccess ? (
              <span className="font-bold text-status-done">
                תקין: {testMutation.data.verifiedName || 'ללא שם מאומת'} (<span dir="ltr">{testMutation.data.displayPhoneNumber}</span>)
              </span>
            ) : testMutation.isError ? (
              <span className="font-bold text-destructive">{testMutation.error instanceof Error ? testMutation.error.message : 'הבדיקה נכשלה.'}</span>
            ) : (
              'שולח בקשה לשרתי WhatsApp עם ההגדרות הנוכחיות.'
            )
          }
        >
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => testMutation.mutate()} disabled={testMutation.isPending} className="gap-1.5">
              <Activity size={14} />
              {testMutation.isPending ? 'בודק…' : 'בדיקה'}
            </Button>
          </div>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="שגיאות אחרונות" description="כשלי Webhook, עיבוד הודעות ובדיקות חיבור — 20 האחרונות.">
        {errors.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">אין שגיאות.</p>
        ) : (
          errors.map((entry) => (
            <div key={entry.id} className="flex flex-col gap-0.5 border-t border-border/70 px-4 py-3 first:border-t-0">
              <span className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-bold text-foreground">{SOURCE_LABELS[entry.source] ?? entry.source}</span>
                <span className="text-xs text-muted-foreground">{new Date(entry.created).toLocaleString('he-IL')}</span>
              </span>
              <p className="break-words text-xs text-muted-foreground">{entry.message}</p>
            </div>
          ))
        )}
      </SettingsSection>
    </>
  )
}

function EnvVarRow({ name, configured }: { name: string; configured: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3 text-xs">
      <span className="truncate font-mono text-foreground" dir="ltr">
        {name}
      </span>
      {configured ? (
        <span className="flex shrink-0 items-center gap-1 font-bold text-status-done">
          <CheckCircle2 size={13} /> מוגדר
        </span>
      ) : (
        <span className="flex shrink-0 items-center gap-1 font-bold text-destructive">
          <AlertTriangle size={13} /> חסר
        </span>
      )}
    </li>
  )
}

function ReadOnlyCopyInput({ value, placeholder, label }: { value: string; placeholder?: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!value) return
    void navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex items-center gap-2">
      <Input value={value} placeholder={placeholder} readOnly dir="ltr" aria-label={label} className="min-w-0 flex-1 bg-muted/50 font-mono text-xs text-muted-foreground" />
      <Button type="button" variant="outline" size="icon" disabled={!value} className="shrink-0 cursor-pointer" onClick={handleCopy} aria-label={`העתקת ${label}`}>
        {copied ? <Check className="size-4 text-status-done" /> : <Copy className="size-4" />}
      </Button>
    </div>
  )
}
