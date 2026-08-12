import { createFileRoute } from '@tanstack/react-router'
import { FaqTab } from '@/features/settings/components/FaqTab'

export const Route = createFileRoute('/dashboard/settings/faq')({
  component: FaqPage,
})

function FaqPage() {
  return (
    <div className="flex flex-col gap-[18px] px-4 pt-5 font-assistant lg:px-8 lg:pt-8" dir="rtl">
      <div className="hidden lg:flex lg:flex-col lg:gap-0.5">
        <h1 className="text-[23px] font-extrabold tracking-tight text-foreground">שאלות נפוצות</h1>
        <p className="text-[13.5px] font-medium text-muted-foreground">מאגר הידע וחוקי הברזל של הסוכן</p>
      </div>
      <FaqTab />
    </div>
  )
}
