import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { Check, MessageSquare } from 'lucide-react'
import { completeOnboarding } from '@/features/onboarding/server/onboarding'
import { useSetupChecklist } from '@/features/onboarding/components/SetupChecklist'

export const Route = createFileRoute('/onboarding/done')({
  component: DoneStep,
})

function DoneStep() {
  const navigate = useNavigate()
  const { items, isLoading } = useSetupChecklist()
  const [error, setError] = useState<string | null>(null)
  const remaining = items.filter((i) => !i.done).length

  const finishMutation = useMutation({
    mutationFn: () => completeOnboarding(),
    onSuccess: () => navigate({ to: '/dashboard' }),
    onError: (err: unknown) => setError(err instanceof Error ? err.message : 'שגיאה בסיום ההגדרה'),
  })

  return (
    <div className="step-body items-center justify-center text-center">
      <div className="flex size-[92px] items-center justify-center rounded-full bg-success/12">
        <Check size={44} className="text-success" />
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-[30px] font-extrabold text-foreground">הסטודיו מוכן</h1>
        <p className="text-[16.5px] text-muted-foreground">
          הסוכן כבר יכול לענות ללקוחות, לאסוף פרטים ולהציע תורים בשעות שהגדרת.
        </p>
      </div>

      <div className="row-native card-native w-full !border-t-0">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-success/12 text-success">
          <MessageSquare size={18} />
        </div>
        <div className="min-w-0 flex-1 text-start">
          <div className="text-[15px] font-bold text-foreground">וואטסאפ מחובר</div>
          <div className="text-[13.5px] text-muted-foreground">נבדק אוטומטית — לא נדרשה פעולה</div>
        </div>
      </div>

      {error && <p className="text-[13px] font-bold text-destructive">{error}</p>}

      <div className="flex-1" />

      <div className="step-footer">
        <button type="button" disabled={finishMutation.isPending} onClick={() => finishMutation.mutate()} className="btn-native">
          {finishMutation.isPending ? 'נכנס…' : 'כניסה למערכת'}
        </button>
        {!isLoading && remaining > 0 && (
          <p className="text-center text-[14.5px] font-bold text-muted-foreground">נשארו {remaining} הגדרות לא־חובה</p>
        )}
      </div>
    </div>
  )
}
