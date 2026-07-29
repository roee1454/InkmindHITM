import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { z } from 'zod'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { TeamAccessTab } from '@/features/settings/components/TeamAccessTab'
import { CalendarFeedsTab } from '@/features/settings/components/CalendarFeedsTab'
import { AiAgentTab } from '@/features/settings/components/AiAgentTab'
import { StudioPolicyTab } from '@/features/settings/components/StudioPolicyTab'
import { WhatsAppSettingsTab } from '@/features/settings/components/WhatsAppSettingsTab'

const settingsSearchSchema = z.object({
  tab: z.enum(['team', 'calendar', 'ai', 'policy', 'whatsapp']).optional().default('team'),
})

export const Route = createFileRoute('/dashboard/settings')({
  validateSearch: settingsSearchSchema,
  component: SettingsPage,
})

function SettingsPage() {
  const search = useSearch({ from: '/dashboard/settings' })
  const navigate = useNavigate({ from: '/dashboard/settings' })
  const activeTab = search.tab || 'team'

  const settingsTabs = [
    { label: 'צוות והרשאות', id: 'team', description: 'הגדרת חברי הצוות, תפקידים, הרשאות גישה וסיסמאות' },
    { label: 'קישורי יומן', id: 'calendar', description: 'חיבור וסנכרון תורים עם Google Calendar' },
    { label: 'הגדרות סוכן AI', id: 'ai', description: 'פרמטרים של בוט ה-AI, כיבוי חירום ומאגר ידע' },
    { label: 'מדיניות סטודיו', id: 'policy', description: 'אמצעי תשלום למקדמה, חלון ביטול, ימי סגירה והתראות' },
    { label: 'וואטסאפ', id: 'whatsapp', description: 'הגדרות חיבור WhatsApp Cloud API, טוקנים ו-Webhook' },
  ]

  const activeTabObj = settingsTabs.find((t) => t.id === activeTab) ?? settingsTabs[0]!

  const handleTabChange = (val: string) => {
    void navigate({
      search: (old) => ({ ...old, tab: val as 'team' | 'calendar' | 'ai' | 'policy' | 'whatsapp' }),
    })
  }

  return (
    <div className="w-full font-assistant">
      <div className="w-full max-w-5xl mx-auto space-y-6 text-right py-6" dir="rtl">
        {/* Page Title & Subtitle */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-1">
            הגדרות מערכת
          </h1>
          <p className="text-xs text-muted-foreground">
            {activeTabObj.description}
          </p>
        </div>

        {/* System Styled Navigation Tabs Bar */}
        <Tabs value={activeTab} onValueChange={handleTabChange} dir="rtl">
          <TabsList className="bg-muted/70 border border-border/80 p-1.5 rounded-2xl inline-flex flex-wrap gap-1 h-auto shadow-sm">
            {settingsTabs.map((item) => (
              <TabsTrigger
                key={item.id}
                value={item.id}
                className="cursor-pointer data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground rounded-xl px-4 py-2 font-assistant font-bold text-xs transition-all hover:text-foreground"
              >
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab Contents */}
          <div className="w-full pt-4">
            <TabsContent value="team" className="focus-visible:outline-none">
              <TeamAccessTab />
            </TabsContent>
            <TabsContent value="calendar" className="focus-visible:outline-none">
              <CalendarFeedsTab />
            </TabsContent>
            <TabsContent value="ai" className="focus-visible:outline-none">
              <AiAgentTab />
            </TabsContent>
            <TabsContent value="policy" className="focus-visible:outline-none">
              <StudioPolicyTab />
            </TabsContent>
            <TabsContent value="whatsapp" className="focus-visible:outline-none">
              <WhatsAppSettingsTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
