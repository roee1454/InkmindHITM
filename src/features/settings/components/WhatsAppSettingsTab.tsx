import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Check, Copy, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getWhatsAppSettingsForm,
  testWhatsAppConnection,
} from '../server/settings'

export function WhatsAppSettingsTab() {
  const settingsQuery = useQuery({
    queryKey: ['whatsapp-settings-form'],
    queryFn: () => getWhatsAppSettingsForm(),
  })

  const [phoneNumberId, setPhoneNumberId] = useState('')
  const [businessAccountId, setBusinessAccountId] = useState('')
  const [verifyToken, setVerifyToken] = useState('')

  useEffect(() => {
    const s = settingsQuery.data
    if (!s) return
    setPhoneNumberId(s.phoneNumberId)
    setBusinessAccountId(s.businessAccountId)
    setVerifyToken(s.verifyToken)
  }, [settingsQuery.data])

  const webhookUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/api/whatsapp-webhook` : ''

  const testMutation = useMutation({
    mutationFn: () =>
      testWhatsAppConnection({
        data: {
          phoneNumberId: phoneNumberId || undefined,
        },
      }),
  })

  if (settingsQuery.isLoading) {
    return <p className="font-assistant text-xs text-muted-foreground">טוען הגדרות…</p>
  }

  return (
    <div className="space-y-0 font-assistant text-right" dir="rtl">
      {/* Section 1: Connection IDs */}
      <div className="grid grid-cols-1 gap-6 border-b border-border/60 py-6 lg:grid-cols-12">
        <div className="space-y-1 lg:col-span-5">
          <h3 className="text-sm md:text-base font-bold text-foreground">פרטי מזהי WhatsApp</h3>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            מזהה מספר טלפון ומזהה חשבון עסקי מלוח הבקרה של Meta Developers. הטוקנים וסוד האפליקציה שמורים במשתני הסביבה (ENV).
          </p>
        </div>

        <div className="space-y-4 lg:col-span-7">
          <Field label="מזהה מספר טלפון (Phone Number ID)">
            <ReadOnlyCopyInput value={phoneNumberId} placeholder="למשל 123456789012345" />
          </Field>

          <Field label="מזהה חשבון עסקי (Business Account ID)">
            <ReadOnlyCopyInput value={businessAccountId} placeholder="לא מוגדר" />
          </Field>
        </div>
      </div>

      {/* Section 2: Verification & Webhook */}
      <div className="grid grid-cols-1 gap-6 border-b border-border/60 py-6 lg:grid-cols-12">
        <div className="space-y-1 lg:col-span-5">
          <h3 className="text-sm md:text-base font-bold text-foreground">אימות ו-Webhook</h3>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            טוקן אימות וכתובת ה-Webhook להעתקה ללוח הבקרה של Meta.
          </p>
        </div>

        <div className="space-y-4 lg:col-span-7">
          <Field label="טוקן אימות Webhook (Verify Token)">
            <ReadOnlyCopyInput value={verifyToken} placeholder="לא מוגדר" />
          </Field>

          <Field label="כתובת ה-Webhook (להעתקה ללוח הבקרה של Meta)">
            <ReadOnlyCopyInput value={webhookUrl} placeholder="http://..." />
          </Field>
        </div>
      </div>

      {/* Section 3: Actions & Test */}
      <div className="grid grid-cols-1 gap-6 py-6 lg:grid-cols-12">
        <div className="space-y-1 lg:col-span-5">
          <h3 className="text-sm md:text-base font-bold text-foreground">שמירה ובדיקת חיבור</h3>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            שמור את הפרטים ובדוק שהחיבור מול שרתי WhatsApp מתבצע כראוי.
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

export default WhatsAppSettingsTab
