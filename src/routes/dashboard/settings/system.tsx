import { createFileRoute } from '@tanstack/react-router'
import { SystemTab } from '@/features/settings/tabs/system/SystemTab'

export const Route = createFileRoute('/dashboard/settings/system')({
  component: SystemPage,
})

function SystemPage() {
  return (
    <div className="flex flex-col gap-[18px] px-4 pt-5 font-assistant lg:px-8 lg:pt-8" dir="rtl">
      <SystemTab />
    </div>
  )
}

