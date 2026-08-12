import { createFileRoute } from '@tanstack/react-router'
import { BackupSettingsTab } from '@/features/settings/components/BackupSettingsTab'

export const Route = createFileRoute('/dashboard/settings/backups')({
  component: BackupsPage,
})

function BackupsPage() {
  return (
    <div className="flex flex-col gap-[18px] px-4 pt-5 font-assistant lg:px-8 lg:pt-8" dir="rtl">
      <div className="hidden lg:flex lg:flex-col lg:gap-0.5">
        <h1 className="text-[23px] font-extrabold tracking-tight text-foreground">גיבויים</h1>
        <p className="text-[13.5px] font-medium text-muted-foreground">גיבוי וניהול נתוני הסטודיו</p>
      </div>
      <BackupSettingsTab />
    </div>
  )
}
