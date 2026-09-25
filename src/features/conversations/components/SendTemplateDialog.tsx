import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import {
  listApprovedTemplates,
  sendConversationTemplate,
} from '@/features/conversations/server/messages'
import { Send, FileText, AlertCircle, Loader2 } from '@/components/ui/icon'
import type { UIConversation, UIMessage } from '@/features/conversations/types'
import type { UIMetaTemplate } from '@/integrations/whatsapp-cloud-api/types'
import { shouldExcludeTemplate } from '../utils/templates'
import { TemplateComposer } from './TemplateComposer'

interface SendTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversation: UIConversation
  onSuccess?: (message: UIMessage) => void
}

export function SendTemplateDialog({
  open,
  onOpenChange,
  conversation,
  onSuccess,
}: SendTemplateDialogProps) {
  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['approved-whatsapp-templates'],
    queryFn: () => listApprovedTemplates(),
    staleTime: 60_000,
    enabled: open,
  })

  const rawTemplates = templatesData?.templates ?? []
  const templates = React.useMemo(
    () => rawTemplates.filter((t) => !shouldExcludeTemplate(t)),
    [rawTemplates],
  )

  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string>('')
  const [paramValues, setParamValues] = React.useState<string[]>([])
  const [isSending, setIsSending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Auto-select first template when templates load
  React.useEffect(() => {
    if (templates.length > 0 && (!selectedTemplateId || !templates.some((t) => t.id === selectedTemplateId))) {
      setSelectedTemplateId(templates[0]!.id)
    }
  }, [templates, selectedTemplateId])

  const currentTemplate: UIMetaTemplate | undefined =
    templates.find((t) => t.id === selectedTemplateId) || templates[0]

  // Reset / prefill parameters when template or customer changes
  React.useEffect(() => {
    if (!currentTemplate) {
      setParamValues([])
      return
    }
    const initial = currentTemplate.params.map((_, idx) => {
      if (idx === 0) return conversation.customerName || ''
      return ''
    })
    setParamValues(initial)
    setError(null)
  }, [selectedTemplateId, conversation.customerName, currentTemplate])

  const handleParamChange = (index: number, val: string) => {
    setParamValues((prev) => {
      const next = [...prev]
      next[index] = val
      return next
    })
  }

  // Render preview by replacing {{1}}, {{2}}, etc. with param values
  const renderPreview = (tpl: UIMetaTemplate | undefined, values: string[]): string => {
    if (!tpl) return ''
    let preview = tpl.bodyText
    tpl.params.forEach((p, idx) => {
      const val = values[idx]?.trim() || `{{${p.index}}}`
      const regex = new RegExp(`\\{\\{${p.index}\\}\\}`, 'g')
      preview = preview.replace(regex, val)
    })
    return preview
  }

  const previewText = renderPreview(currentTemplate, paramValues)

  const handleSend = async () => {
    if (!currentTemplate) return
    setIsSending(true)
    setError(null)
    try {
      const res = await sendConversationTemplate({
        data: {
          conversationId: conversation.id,
          templateName: currentTemplate.name,
          languageCode: currentTemplate.language,
          parameters: currentTemplate.params.map((_, i) => paramValues[i] || ''),
          renderedBody: previewText,
        },
      })
      onOpenChange(false)
      onSuccess?.(res)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שליחת התבנית נכשלה.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className="flex items-center gap-2 font-assistant text-base font-bold">
          <FileText className="size-5 text-primary" />
          <span>שליחת תבנית וואטסאפ מאושרת</span>
        </div>
      }
      description="חלון 24 השעות נסגר. ה-CRM מושך תבניות מאושרות (APPROVED) ישירות מ-Meta WhatsApp API."
      contentClassName="sm:max-w-lg"
    >
      <div className="flex flex-col gap-4 py-2 font-assistant" dir="rtl">
        <TemplateComposer
          templates={templates}
          isLoading={isLoading}
          selectedTemplateId={selectedTemplateId}
          onSelectTemplateId={setSelectedTemplateId}
          paramValues={paramValues}
          onParamChange={handleParamChange}
          previewText={previewText}
          recipientPhone={conversation.customerPhone}
          recipientDisplayName={conversation.customerName}
        />

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {templates.length > 0 && !isLoading && (
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSending}
              className="cursor-pointer"
            >
              ביטול
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSend}
              disabled={isSending || !currentTemplate}
              className="flex items-center gap-1.5 cursor-pointer font-bold bg-primary hover:bg-primary/90"
            >
              {isSending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              <span>{isSending ? 'שולח תבנית…' : 'שלח תבנית מאושרת'}</span>
            </Button>
          </div>
        )}
      </div>
    </ResponsiveDialog>
  )
}
