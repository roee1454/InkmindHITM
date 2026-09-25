import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Wallet, Check } from '@/components/ui/icon'
import { getSettings, saveOnboardingPayments } from '@/features/onboarding/server/onboarding'
import { useOnboardingUiStore } from '../store/onboardingUiStore'

export function PaymentsStep() {
  const queryClient = useQueryClient()

  const depositRequired = useOnboardingUiStore((s) => s.depositRequired)
  const depositAmount = useOnboardingUiStore((s) => s.depositAmount)
  const paymentInstructions = useOnboardingUiStore((s) => s.paymentInstructions)
  const paymentsError = useOnboardingUiStore((s) => s.paymentsError)

  const setDepositRequired = useOnboardingUiStore((s) => s.setDepositRequired)
  const setDepositAmount = useOnboardingUiStore((s) => s.setDepositAmount)
  const setPaymentInstructions = useOnboardingUiStore((s) => s.setPaymentInstructions)
  const setPaymentsError = useOnboardingUiStore((s) => s.setPaymentsError)
  const nextStep = useOnboardingUiStore((s) => s.nextStep)

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => getSettings(),
  })

  useEffect(() => {
    if (!settings) return
    if (settings.deposit_required !== undefined) {
      setDepositRequired(Boolean(settings.deposit_required))
    }
    if (settings.deposit_amount !== undefined && settings.deposit_amount !== null) {
      setDepositAmount(Number(settings.deposit_amount))
    }
    if (settings.payment_instructions) {
      setPaymentInstructions(String(settings.payment_instructions))
    }
  }, [settings, setDepositRequired, setDepositAmount, setPaymentInstructions])

  const saveMutation = useMutation({
    mutationFn: () =>
      saveOnboardingPayments({
        data: {
          depositRequired,
          depositAmount: depositRequired ? depositAmount ?? 0 : 0,
          paymentInstructions: paymentInstructions.trim(),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setPaymentsError(null)
      nextStep()
    },
    onError: (err: unknown) =>
      setPaymentsError(err instanceof Error ? err.message : 'שגיאה בשמירת פרטי התשלום'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (depositRequired && (!depositAmount || depositAmount <= 0)) {
      setPaymentsError('נא להזין סכום מקדמה תקין (גדול מ-0 ₪)')
      return
    }
    setPaymentsError(null)
    saveMutation.mutate()
  }

  return (
    <form onSubmit={handleSubmit} className="step-body">
      <div className="flex flex-col gap-2">
        <h1 className="step-question text-3xl">מקדמות ואמצעי תשלום</h1>
        <p className="step-hint">
          הגדר האם הבוט ידרוש מקדמה בעת שריון תור, וכיצד הלקוחות יוכלו להעביר אותה.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Toggle Deposit Required */}
        <div className="flex items-center justify-between rounded-2xl border border-input bg-card p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Wallet size={20} />
            </div>
            <div className="flex flex-col text-start">
              <span className="text-sm font-bold text-foreground">דרישת מקדמה לקביעת תור</span>
              <span className="text-xs text-muted-foreground">
                הבוט יבקש מקדמה לפני נעילת התור ביומן
              </span>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={depositRequired}
            onClick={() => setDepositRequired(!depositRequired)}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              depositRequired ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                depositRequired ? '-translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Deposit Amount (shown when toggle is on) */}
        {depositRequired && (
          <div className="flex flex-col gap-1.5 text-start animate-in fade-in duration-200">
            <label className="text-sm font-bold text-foreground">סכום מקדמה ברירת מחדל (₪) *</label>
            <div className="flex h-14 w-full items-center gap-2 rounded-2xl border border-input bg-card px-4 shadow-xs outline-none transition-all duration-150 ease-native focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
              <span className="text-base font-bold text-muted-foreground">₪</span>
              <input
                type="number"
                min="0"
                step="50"
                value={depositAmount ?? ''}
                onChange={(e) => setDepositAmount(e.target.value ? Number(e.target.value) : null)}
                placeholder="200"
                className="h-full w-full border-0 bg-transparent p-0 text-base font-bold text-foreground shadow-none outline-none focus-visible:ring-0"
              />
            </div>
          </div>
        )}

        {/* Payment Instructions */}
        <div className="flex flex-col gap-1.5 text-start">
          <label className="text-sm font-bold text-foreground">הוראות תשלום ללקוח</label>
          <textarea
            rows={3}
            value={paymentInstructions}
            onChange={(e) => setPaymentInstructions(e.target.value)}
            placeholder="למשל: העברה ב-Bit או PayBox לנייד 050-1234567 (נא לציין שם מלא בהערות ההעברה)."
            className="w-full rounded-2xl border border-input bg-card p-4 text-sm leading-relaxed text-foreground shadow-xs outline-none transition-all duration-150 ease-native placeholder:text-muted-foreground/50 focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
          <span className="text-xs text-muted-foreground">
            הוראות אלו יישלחו ללקוח ב-WhatsApp בעת תיאום תור הדורש מקדמה.
          </span>
        </div>
      </div>

      {paymentsError && <p className="text-sm font-bold text-destructive">{paymentsError}</p>}

      <div className="flex-1" />

      <div className="step-footer">
        <button type="submit" disabled={saveMutation.isPending} className="btn-native">
          <Check size={18} />
          <span>{saveMutation.isPending ? 'שומר…' : 'אישור והמשך ליומן Google'}</span>
        </button>
      </div>
    </form>
  )
}
