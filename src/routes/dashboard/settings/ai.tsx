import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { AITab, type AISubTab } from '@/features/settings/tabs/ai/AITab'

const searchSchema = z.object({
  sub: z.enum(['agent', 'rules', 'policy', 'closures']).optional(),
})

export const Route = createFileRoute('/dashboard/settings/ai')({
  validateSearch: searchSchema,
  component: AiPage,
})

function AiPage() {
  const navigate = useNavigate({ from: Route.fullPath })
  const { sub } = Route.useSearch()

  return (
    <div className="flex flex-col gap-[18px] px-4 pt-5 pb-8 font-assistant lg:px-8 lg:pt-8" dir="rtl">
      <AITab
        subTab={sub}
        onSubTabChange={(newSub: AISubTab) =>
          navigate({ search: { sub: newSub === 'agent' ? undefined : newSub } })
        }
      />
    </div>
  )
}
