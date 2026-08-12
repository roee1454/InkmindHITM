import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SetupChecklist } from '@/features/onboarding/components/SetupChecklist'
import { dismissChecklistCard } from '@/features/onboarding/server/onboarding'

export const Route = createFileRoute('/dashboard/setup')({
  component: SetupChecklistPage,
})

function SetupChecklistPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const dismissMutation = useMutation({
    mutationFn: () => dismissChecklistCard(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.invalidateQueries({ queryKey: ['setup-checklist-state'] })
      navigate({ to: '/dashboard' })
    },
  })

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-[18px] font-assistant" dir="rtl">
      <p className="px-1 text-sm font-medium text-muted-foreground">
        אף אחת מאלה לא חוסמת אותך. הסוכן עובד גם בלעדיהן.
      </p>

      <SetupChecklist />

      <button
        type="button"
        disabled={dismissMutation.isPending}
        onClick={() => dismissMutation.mutate()}
        className="cursor-pointer text-center text-[14.5px] font-bold text-muted-foreground"
      >
        אל תציג שוב
      </button>
    </div>
  )
}
