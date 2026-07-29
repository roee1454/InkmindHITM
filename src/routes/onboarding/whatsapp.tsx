import { useState, useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getCurrentSession } from '@/features/auth/server/auth'
import { getSettings, updateStudioSettings } from '@/features/onboarding/server/onboarding'
import { MessageSquare, ShieldCheck, ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/onboarding/whatsapp')({
  loader: () => getCurrentSession(),
  component: WhatsappStep,
})

function WhatsappStep() {
  const session = Route.useLoaderData()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [phoneNumberId, setPhoneNumberId] = useState('')
  const [businessAccountId, setBusinessAccountId] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [verifyToken, setVerifyToken] = useState('roee-verify-token')
  const [appSecret, setAppSecret] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => getSettings(),
  })

  useEffect(() => {
    if (settings) {
      setPhoneNumberId(settings.whatsapp_phone_number_id || '')
      setBusinessAccountId(settings.whatsapp_business_account_id || '')
      setVerifyToken(settings.whatsapp_webhook_verify_token || 'roee-verify-token')
      setAccessToken(settings.whatsapp_access_token || '')
      setAppSecret(settings.whatsapp_app_secret || '')
    }
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: async () => {
      await updateStudioSettings({
        data: {
          whatsapp_phone_number_id: phoneNumberId.trim(),
          whatsapp_business_account_id: businessAccountId.trim(),
          whatsapp_access_token: accessToken.trim(),
          whatsapp_webhook_verify_token: verifyToken.trim(),
          whatsapp_app_secret: appSecret.trim(),
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      navigate({ to: '/onboarding/profile' })
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת הגדרות WhatsApp')
    },
  })

  if (!session) return null

  return (
    <div className="space-y-6 text-right font-assistant" dir="rtl">
      {/* Prominent Security Notice Banner */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 sm:p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
            <ShieldCheck size={20} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-300">
              אבטחת מידע ופרטיות מלאה
            </h3>
            <p className="text-xs text-emerald-900/80 dark:text-emerald-200/80 leading-relaxed">
              כל פרטי ה-WhatsApp Cloud API (כולל טוקנים וסוד האפליקציה) נשמרים בצורה מוצפנת ומאובטחת בשרת שלכם בלבד. אף פרט אינו מועבר לשום גורם צד שלישי.
            </p>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MessageSquare size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">הגדרת WhatsApp Cloud API</h2>
            <p className="text-xs text-muted-foreground">
              הזינו את מפתחות ה-API מתוך Meta Developer Dashboard
            </p>
          </div>
        </div>

        {error && <p className="text-xs font-semibold text-rose-500">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-foreground mb-1 block">Phone Number ID</label>
            <Input
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              placeholder="לדוגמה: 1255845564274729"
              dir="ltr"
              className="rounded-xl text-xs font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-foreground mb-1 block">Business Account ID (WABA ID)</label>
            <Input
              value={businessAccountId}
              onChange={(e) => setBusinessAccountId(e.target.value)}
              placeholder="לדוגמה: 1019737140964553"
              dir="ltr"
              className="rounded-xl text-xs font-mono"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-foreground mb-1 block">System User Access Token</label>
          <Input
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="EAAb5bYuDGDk..."
            dir="ltr"
            className="rounded-xl text-xs font-mono"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            טוקן הגישה משמש לשליחת הודעות מענה ותזכורות ללקוחות.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-foreground mb-1 block">Webhook Verify Token</label>
            <Input
              value={verifyToken}
              onChange={(e) => setVerifyToken(e.target.value)}
              placeholder="roee-verify-token"
              dir="ltr"
              className="rounded-xl text-xs font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-foreground mb-1 block">App Secret (סוד האפליקציה)</label>
            <Input
              type="password"
              value={appSecret}
              onChange={(e) => setAppSecret(e.target.value)}
              placeholder="סוד האפליקציה מתוך Meta Basic Settings"
              dir="ltr"
              className="rounded-xl text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* Action Footer — no skip button */}
      <div className="flex items-center justify-end pt-2">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="rounded-xl px-6 font-bold cursor-pointer gap-2"
        >
          <span>{saveMutation.isPending ? 'שומר מפתחות...' : 'שמור והמשך לפרופיל'}</span>
          <ArrowLeft size={16} />
        </Button>
      </div>
    </div>
  )
}
