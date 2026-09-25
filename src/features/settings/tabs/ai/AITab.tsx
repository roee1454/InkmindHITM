import React, { useState } from 'react'
import { Bot, SlidersHorizontal, Sparkles, CalendarOff } from '@/components/ui/icon'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AiStatusCard } from './components/AiStatusCard'
import { AiModelCard } from './components/AiModelCard'
import { AiDevResetCard } from './components/AiDevResetCard'
import { AiDevTimeSimulationCard } from './components/AiDevTimeSimulationCard'
import { AiPolicyFormCard } from './components/AiPolicyFormCard'
import { ProjectPolicyCard } from './components/ProjectPolicyCard'
import { AiIronRulesCard } from './components/AiIronRulesCard'
import { AiKnowledgeBaseCard } from './components/AiKnowledgeBaseCard'
import { ClosuresSection } from './components/ClosuresSection'

export type AISubTab = 'agent' | 'rules' | 'policy' | 'closures'

export interface AITabProps {
  subTab?: AISubTab
  onSubTabChange?: (subTab: AISubTab) => void
}

export const AITab: React.FC<AITabProps> = ({
  subTab: controlledSubTab,
  onSubTabChange,
}) => {
  const [localSubTab, setLocalSubTab] = useState<AISubTab>('agent')
  const currentSubTab = controlledSubTab ?? localSubTab

  const handleTabChange = (value: string) => {
    const next = value as AISubTab
    if (onSubTabChange) {
      onSubTabChange(next)
    } else {
      setLocalSubTab(next)
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6 pb-16 font-assistant" dir="rtl">
      {/* Page Header */}
      <div className="page-head hidden lg:flex">
        <h1>סוכן AI ומדיניות</h1>
        <p>תפעול מודל, חוקי שיחה, תנאי ביטול ומקדמה, וימי סגירה בסטודיו</p>
      </div>

      <Tabs dir='rtl' value={currentSubTab} onValueChange={handleTabChange} className="flex flex-col gap-5">
        <div className="w-full">
          <TabsList className="flex w-full items-center gap-1.5 overflow-x-auto scrollbar-none p-1.5 sm:grid sm:grid-cols-4 sm:overflow-visible h-auto bg-card border border-border rounded-2xl shadow-2xs">
            <TabsTrigger
              value="agent"
              className="shrink-0 gap-2 h-10 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-primary/20"
            >
              <Bot size={16} />
              <span>תפעול ומודל</span>
            </TabsTrigger>
            <TabsTrigger
              value="rules"
              className="shrink-0 gap-2 h-10 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-primary/20"
            >
              <Sparkles size={16} />
              <span>חוקים וידע</span>
            </TabsTrigger>
            <TabsTrigger
              value="policy"
              className="shrink-0 gap-2 h-10 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-primary/20"
            >
              <SlidersHorizontal size={16} />
              <span>מדיניות ותשלומים</span>
            </TabsTrigger>
            <TabsTrigger
              value="closures"
              className="shrink-0 gap-2 h-10 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-primary/20"
            >
              <CalendarOff size={16} />
              <span>ימי סגירה וחגים</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Agent & Model */}
        <TabsContent value="agent" className="flex flex-col gap-5">
          <AiStatusCard />
          <AiModelCard />
          <AiDevResetCard />
          <AiDevTimeSimulationCard />
        </TabsContent>

        {/* Tab 2: Rules & Knowledge */}
        <TabsContent value="rules" className="flex flex-col gap-5">
          <AiIronRulesCard />
          <AiKnowledgeBaseCard />
        </TabsContent>

        {/* Tab 3: Policy & Payments */}
        <TabsContent value="policy" className="flex flex-col gap-5">
          <AiPolicyFormCard />
          <ProjectPolicyCard />
        </TabsContent>

        {/* Tab 4: Closures & Holidays */}
        <TabsContent value="closures" className="flex flex-col gap-5">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col gap-4 font-assistant">
            <ClosuresSection />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AITab
