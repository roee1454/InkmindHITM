import { createFileRoute } from '@tanstack/react-router'
import { AiAgentTab } from '@/features/settings/components/AiAgentTab'

export const Route = createFileRoute('/dashboard/settings/ai')({
  component: AiPage,
})

function AiPage() {
  return (
    <div className="flex flex-col gap-[18px] px-4 pt-5 font-assistant lg:px-8 lg:pt-8" dir="rtl">
      <div className="hidden lg:flex lg:flex-col lg:gap-0.5">
        <h1 className="text-[23px] font-extrabold tracking-tight text-foreground">סוכן AI</h1>
        <p className="text-[13.5px] font-medium text-muted-foreground">הגדרות הסוכן והתנהגותו בשיחות</p>
      </div>
      <AiAgentTab />
    </div>
  )
}
