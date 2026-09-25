import React from 'react'
import { Database, MessageSquare } from '@/components/ui/icon'
import { BackupSettingsTab } from './components/BackupSettingsTab'
import { WhatsAppDiagnostics } from './components/WhatsAppDiagnostics'

export const SystemTab: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 pb-16 font-assistant max-w-3xl" dir="rtl">
      <div className="page-head hidden lg:flex">
        <h1>מערכת</h1>
        <p>גיבויי נתונים, שחזור ואבחון תקשורת WhatsApp Cloud API</p>
      </div>

      {/* Card 1: Backups & Restore */}
      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Database size={18} className="text-primary" />
          <h2 className="text-base font-bold text-foreground">גיבוי ושחזור נתונים</h2>
        </div>
        <BackupSettingsTab />
      </section>

      {/* Card 2: WhatsApp Cloud API Diagnostics */}
      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <MessageSquare size={18} className="text-primary" />
          <h2 className="text-base font-bold text-foreground">אבחון חיבור WhatsApp Cloud API</h2>
        </div>
        <WhatsAppDiagnostics />
      </section>
    </div>
  )
}

export default SystemTab
