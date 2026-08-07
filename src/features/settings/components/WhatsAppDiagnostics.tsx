import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Check, Copy, Activity, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getWhatsAppSettingsForm, testWhatsAppConnection, getWhatsAppErrorLog } from '../server/settings'

const SOURCE_LABELS: Record<string, string> = {
  webhook_signature: 'חתימת Webhook',
  webhook_processing: 'עיבוד הודעה נכנסת',
  test_connection: 'בדיקת חיבור',
}

/**
 * Read-only WhatsApp Cloud API diagnostics — env var status, connection test, and recent
 * error log. Credentials are only ever configured via environment variables (see CLAUDE.md);
 * there is no write path here on purpose. Shared between dashboard Settings and the
 * onboarding WhatsApp step so both present identical information.
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

  if (settingsQuery.isLoading) {
    return <p className="font-assistant text-xs text-muted-foreground">טוען הגדרות…</p>
  }

  const s = settingsQuery.data

  return (
    <div className="space-y-0 font-assistant text-right" dir="rtl">
      {/* Section 1: Env var status */}
      <div className="grid grid-cols-1 gap-6 border-b border-border/60 py-6 lg:grid-cols-12">
        <div className="space-y-1 lg:col-span-5">
          <h3 className="text-sm md:text-base font-bold text-foreground">משתני סביבה</h3>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            כל פרטי החיבור ל-WhatsApp Cloud API מוגדרים אך ורק במשתני סביבה בשרת — אין אפשרות
            להזין אותם דרך המערכת.
          </p>
        </div>

        <div className="space-y-2 lg:col-span-7">
          <EnvVarRow name="WHATSAPP_PHONE_NUMBER_ID" configured={s?.hasPhoneNumberId ?? false} />
          <EnvVarRow name="WHATSAPP_BUSINESS_ACCOUNT_ID" configured={s?.hasBusinessAccountId ?? false} />
          <EnvVarRow name="WHATSAPP_WEBHOOK_VERIFY_TOKEN" configured={s?.hasVerifyToken ?? false} />
          <EnvVarRow name="WHATSAPP_ACCESS_TOKEN" configured={s?.hasAccessToken ?? false} />
          <EnvVarRow name="WHATSAPP_APP_SECRET" configured={s?.hasAppSecret ?? false} />
        </div>
      </div>

      {/* Section 2: Connection details */}
      <div className="grid grid-cols-1 gap-6 border-b border-border/60 py-6 lg:grid-cols-12">
        <div className="space-y-1 lg:col-span-5">
          <h3 className="text-sm md:text-base font-bold text-foreground">פרטי חיבור</h3>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            מזהים לא-סודיים ('Phone Number ID' וכו') וכתובת ה-Webhook להעתקה ללוח הבקרה של Meta.
          </p>
        </div>

        <div className="space-y-4 lg:col-span-7">
          <Field label="מזהה מספר טלפון (Phone Number ID)">
            <ReadOnlyCopyInput value={s?.phoneNumberId ?? ''} placeholder="לא מוגדר" />
          </Field>
          <Field label="מזהה חשבון עסקי (Business Account ID)">
            <ReadOnlyCopyInput value={s?.businessAccountId ?? ''} placeholder="לא מוגדר" />
          </Field>
          <Field label="כתובת ה-Webhook (להעתקה ללוח הבקרה של Meta)">
            <ReadOnlyCopyInput value={webhookUrl} placeholder="http://..." />
          </Field>
        </div>
      </div>

      {/* Section 3: Test connection */}
      <div className="grid grid-cols-1 gap-6 border-b border-border/60 py-6 lg:grid-cols-12">
        <div className="space-y-1 lg:col-span-5">
          <h3 className="text-sm md:text-base font-bold text-foreground">בדיקת חיבור</h3>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            בודק שהחיבור מול שרתי WhatsApp מתבצע כראוי עם משתני הסביבה הנוכחיים.
          </p>
        </div>

        <div className="space-y-4 lg:col-span-7">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
            >
              <Activity size={14} className="ml-1.5 text-primary" />
              {testMutation.isPending ? 'בודק…' : 'בדיקת חיבור'}
            </Button>
          </div>

          {testMutation.isSuccess ? (
            <p className="text-xs font-semibold text-emerald-400">
              החיבור תקין: {testMutation.data.verifiedName || 'ללא שם מאומת'} (
              {testMutation.data.displayPhoneNumber})
            </p>
          ) : null}
          {testMutation.isError ? (
            <p className="text-xs font-semibold text-destructive">
              {testMutation.error instanceof Error
                ? testMutation.error.message
                : 'בדיקת החיבור נכשלה.'}
            </p>
          ) : null}
        </div>
      </div>

      {/* Section 4: Recent errors */}
      <div className="grid grid-cols-1 gap-6 py-6 lg:grid-cols-12">
        <div className="space-y-1 lg:col-span-5">
          <h3 className="text-sm md:text-base font-bold text-foreground">שגיאות אחרונות</h3>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            כשלי חתימת Webhook, עיבוד הודעות נכנסות, ובדיקות חיבור — 20 האחרונות.
          </p>
        </div>

        <div className="space-y-2 lg:col-span-7">
          {(errorLogQuery.data ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">אין שגיאות מתועדות.</p>
          ) : (
            <ul className="space-y-1.5">
              {errorLogQuery.data!.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm"
                >
                  <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-foreground">
                        {SOURCE_LABELS[entry.source] ?? entry.source}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(entry.created).toLocaleString('he-IL')}
                      </span>
                    </div>
                    <p className="mt-0.5 break-words text-muted-foreground">{entry.message}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function EnvVarRow({ name, configured }: { name: string; configured: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
      <span className="font-mono text-xs text-foreground" dir="ltr">
        {name}
      </span>
      {configured ? (
        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
          <CheckCircle2 size={13} /> מוגדר
        </span>
      ) : (
        <span className="flex items-center gap-1 text-[11px] font-semibold text-destructive">
          <AlertTriangle size={13} /> חסר
        </span>
      )}
    </div>
  )
}

function ReadOnlyCopyInput({ value, placeholder }: { value: string; placeholder?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!value) return
    void navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        placeholder={placeholder}
        readOnly
        disabled
        dir="ltr"
        className="bg-muted/50 text-muted-foreground border-input font-mono text-xs cursor-not-allowed opacity-80"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={!value}
        className="rounded-full shrink-0 cursor-pointer"
        onClick={handleCopy}
        title="העתק"
      >
        {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
      </Button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-foreground">{label}</label>
      {children}
    </div>
  )
}

export default WhatsAppDiagnostics
