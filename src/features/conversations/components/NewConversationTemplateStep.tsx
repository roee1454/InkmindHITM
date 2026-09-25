import { AlertCircle } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import type { UIMetaTemplate } from '@/integrations/whatsapp-cloud-api/types'
import { formatPhoneForDisplay } from '@/lib/phone'
import { TemplateComposer } from './TemplateComposer'

export interface SelectedRecipient {
  customerId?: string
  name: string
  phone: string
  isNew?: boolean
}

interface NewConversationTemplateStepProps {
  selectedRecipient: SelectedRecipient
  onBackToRecipient: () => void
  templates: UIMetaTemplate[]
  isLoadingTemplates: boolean
  selectedTemplateId: string
  onSelectTemplateId: (id: string) => void
  paramValues: string[]
  onParamChange: (index: number, val: string) => void
  previewText: string
  botContinuation: boolean
  onBotContinuationChange: (checked: boolean) => void
}

export function NewConversationTemplateStep({
  selectedRecipient,
  onBackToRecipient,
  templates,
  isLoadingTemplates,
  selectedTemplateId,
  onSelectTemplateId,
  paramValues,
  onParamChange,
  previewText,
  botContinuation,
  onBotContinuationChange,
}: NewConversationTemplateStepProps) {
  const recipientDisplayName = selectedRecipient.name || 'הלקוח/ה'

  return (
    <div className="flex flex-col gap-4 font-assistant" dir="rtl">
      {/* Recipient summary bar with Change button */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-2.5 px-3">
        <div className="flex flex-col min-w-0">
          <span className="truncate text-sm font-bold text-foreground">
            {recipientDisplayName}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatPhoneForDisplay(selectedRecipient.phone)}
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onBackToRecipient}
          className="h-8 text-xs font-semibold shrink-0 cursor-pointer"
        >
          החלפה
        </Button>
      </div>

      {/* Meta 24h Window Notice */}
      <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-foreground">
        <AlertCircle className="size-4 shrink-0 mt-0.5 text-primary" />
        <p className="leading-relaxed">
          אין חלון 24 שעות פעיל מול <strong className="text-primary font-bold">{recipientDisplayName}</strong>. ההודעה תישלח כתבנית מאושרת מ-Meta.
        </p>
      </div>

      {/* Shared Unified Template Composer */}
      <TemplateComposer
        templates={templates}
        isLoading={isLoadingTemplates}
        selectedTemplateId={selectedTemplateId}
        onSelectTemplateId={onSelectTemplateId}
        paramValues={paramValues}
        onParamChange={onParamChange}
        previewText={previewText}
        recipientPhone={selectedRecipient.phone}
        recipientDisplayName={recipientDisplayName}
        showBotToggle={true}
        botContinuation={botContinuation}
        onBotContinuationChange={onBotContinuationChange}
      />
    </div>
  )
}
