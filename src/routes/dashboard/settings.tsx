import * as React from 'react'
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { z } from 'zod'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { TeamAccessTab } from '@/features/settings/components/TeamAccessTab'
import { AiAgentTab } from '@/features/settings/components/AiAgentTab'
import { StudioPolicyTab } from '@/features/settings/components/StudioPolicyTab'
import { WhatsAppSettingsTab } from '@/features/settings/components/WhatsAppSettingsTab'
import { BackupSettingsTab } from '@/features/settings/components/BackupSettingsTab'

const settingsSearchSchema = z.object({
  tab: z.enum(['team', 'ai', 'policy', 'whatsapp', 'backups']).optional().default('team'),
})

export const Route = createFileRoute('/dashboard/settings')({
  validateSearch: settingsSearchSchema,
  component: SettingsPage,
})

function SettingsPage() {
  const search = useSearch({ from: '/dashboard/settings' })
  const navigate = useNavigate({ from: '/dashboard/settings' })
  const activeTab = search.tab

  const settingsTabs = [
    { label: 'צוות והרשאות', id: 'team', description: 'הגדרת חברי הצוות, תפקידים, הרשאות גישה, סיסמאות וחיבורי Google Calendar' },
    { label: 'הגדרות סוכן AI', id: 'ai', description: 'פרמטרים של בוט ה-AI, כיבוי חירום ומאגר ידע' },
    { label: 'מדיניות סטודיו', id: 'policy', description: 'אמצעי תשלום למקדמה, חלון ביטול, ימי סגירה והתראות' },
    { label: 'וואטסאפ', id: 'whatsapp', description: 'הגדרות חיבור WhatsApp Cloud API, טוקנים ו-Webhook' },
    { label: 'גיבויים', id: 'backups', description: 'תדירות גיבוי אוטומטי, שמירת גיבויים והרצה ידנית' },
  ]

  const activeTabObj = settingsTabs.find((t) => t.id === activeTab) ?? settingsTabs[0]!

  // Keep the selected pill visible in the mobile scroll strip — without this, arriving from
  // the drawer at ?tab=backups (last pill) shows a strip scrolled to the start with no hint
  // that the active tab is off-screen.
  const tabsListRef = React.useRef<HTMLDivElement>(null)
  const hasPositionedTabs = React.useRef(false)
  React.useEffect(() => {
    const el = tabsListRef.current?.querySelector<HTMLElement>(`[data-tab-id="${activeTab}"]`)
    if (!el) return
    // Jump instantly on first paint — animating the strip while the page is still settling
    // reads as a glitch. Animate only once the user is actually switching tabs.
    el.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: hasPositionedTabs.current ? 'smooth' : 'auto',
    })
    hasPositionedTabs.current = true
  }, [activeTab])

  const handleTabChange = (val: string) => {
    void navigate({
      search: (old) => ({
        ...old,
        tab: val as 'team' | 'ai' | 'policy' | 'whatsapp' | 'backups',
      }),
    })
  }

  return (
    <div className="w-full font-assistant">
      <div className="w-full max-w-5xl mx-auto space-y-4 md:space-y-6 text-right py-1.5 md:py-6" dir="rtl">
        {/* Page Title & Subtitle */}
        <div className="hidden lg:block">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-1">
            הגדרות מערכת
          </h1>
          <p className="text-xs text-muted-foreground">
            {activeTabObj.description}
          </p>
        </div>

        {/* System Styled Navigation Tabs Bar */}
        <Tabs value={activeTab} onValueChange={handleTabChange} dir="rtl">
          {/* Below md this is a single edge-to-edge scrolling strip rather than a wrapping
              block: five pills at ~90px wrapped to three rows and ate ~120px of a 667px
              screen. The negative margin lets it bleed past .page-container's 1rem padding
              so the row reads as scrollable rather than clipped. */}
          <TabsList
            ref={tabsListRef}
            className="scrollbar-none -mx-4 hidden h-auto w-auto max-w-none snap-x snap-mandatory flex-nowrap gap-1 overflow-x-auto rounded-none border-0 bg-transparent px-4 py-0 shadow-none lg:mx-0 lg:w-fit lg:flex-wrap lg:rounded-2xl lg:border lg:border-border/80 lg:bg-muted/70 lg:p-1.5 lg:shadow-sm lg:flex"
          >
            {settingsTabs.map((item) => (
              <TabsTrigger
                key={item.id}
                value={item.id}
                data-tab-id={item.id}
                // `flex-none` is required: TabsTrigger's base sets `flex-1`, which in a
                // nowrap scroll container would squash all five into the visible width.
                className="shrink-0 flex-none cursor-pointer snap-start whitespace-nowrap rounded-xl border border-border/80 bg-muted/70 px-4 py-2 font-assistant text-xs font-bold text-muted-foreground transition-all hover:text-foreground active:scale-[0.97] data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm md:border-0 md:bg-transparent"
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
            <TabsContent value="ai" className="focus-visible:outline-none">
              <AiAgentTab />
            </TabsContent>
            <TabsContent value="policy" className="focus-visible:outline-none">
              <StudioPolicyTab />
            </TabsContent>
            <TabsContent value="whatsapp" className="focus-visible:outline-none">
              <WhatsAppSettingsTab />
            </TabsContent>
            <TabsContent value="backups" className="focus-visible:outline-none">
              <BackupSettingsTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
