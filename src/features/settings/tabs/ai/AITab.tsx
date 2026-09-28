import { SettingsPage } from '@/features/settings/components/settings-layout'
import { AiStatusSection } from './components/AiStatusSection'
import { AiIronRulesSection } from './components/AiIronRulesSection'
import { AiKnowledgeBaseSection } from './components/AiKnowledgeBaseSection'

/**
 * How the WhatsApp bot behaves: whether it answers, the rules it never breaks, and what it knows.
 * Studio policy (payments, cancellations, projects) and closure days used to share this page as
 * sub-tabs; they are the studio's rules, not the bot's, and have their own pages now.
 */
export function AITab() {
  return (
    <SettingsPage title="סוכן AI" description="איך הבוט עונה ללקוחות בוואטסאפ.">
      <AiStatusSection />
      <AiIronRulesSection />
      <AiKnowledgeBaseSection />
    </SettingsPage>
  )
}
