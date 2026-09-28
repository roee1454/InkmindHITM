import { SettingsPage } from '@/features/settings/components/settings-layout'
import { BackupSections } from './components/BackupSections'
import { WhatsAppDiagnostics } from './components/WhatsAppDiagnostics'
import { DevToolsSection } from './components/DevToolsSection'

/** Backups, the WhatsApp connection, and — in development — the tools for testing the bot. */
export function SystemTab() {
  return (
    <SettingsPage title="מערכת" description="גיבויים, החיבור לוואטסאפ ואבחון.">
      <BackupSections />
      <WhatsAppDiagnostics />
      <DevToolsSection />
    </SettingsPage>
  )
}
