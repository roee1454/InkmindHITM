import { useMemo } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageSquare,
} from '@/components/ui/icon'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { UIMetaTemplate } from '@/integrations/whatsapp-cloud-api/types'
import { shouldExcludeTemplate } from '../utils/templates'

export interface TemplateComposerProps {
  templates: UIMetaTemplate[]
  isLoading?: boolean
  selectedTemplateId: string
  onSelectTemplateId: (id: string) => void
  paramValues: string[]
  onParamChange: (index: number, val: string) => void
  previewText: string
  recipientPhone?: string
  recipientDisplayName?: string
  showBotToggle?: boolean
  botContinuation?: boolean
  onBotContinuationChange?: (checked: boolean) => void
}

export function TemplateComposer({
  templates,
  isLoading,
  selectedTemplateId,
  onSelectTemplateId,
  paramValues,
  onParamChange,
  previewText,
  recipientPhone,
  recipientDisplayName,
  showBotToggle = false,
  botContinuation = true,
  onBotContinuationChange,
}: TemplateComposerProps) {
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => !shouldExcludeTemplate(t))
  }, [templates])

  const currentTemplate =
    filteredTemplates.find((t) => t.id === selectedTemplateId) || filteredTemplates[0]

  const cleanPhone = (recipientPhone || '').replace(/\D/g, '')
  const waWebUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2.5 py-10 text-muted-foreground font-assistant" dir="rtl">
        <Loader2 className="size-7 animate-spin text-primary" />
        <span className="text-xs font-semibold">
          טוען תבניות מאושרות מ-Meta WhatsApp Manager…
        </span>
      </div>
    )
  }

  if (filteredTemplates.length === 0) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 text-center font-assistant" dir="rtl">
        <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-accent-ink/10 text-accent-ink">
          <AlertCircle className="size-6" />
        </div>
        <div className="flex flex-col gap-1">
          <h4 className="text-sm font-bold text-foreground">
            לא נמצאו תבניות מאושרות ב-Meta
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            טרם אושרו תבניות הודעה (Templates) בחשבון ה-WhatsApp Business של הסטודיו. לאחר יצירת התבניות במנהל הווטסאפ ואישורן ע״י Meta, הן יופיעו כאן אוטומטית.
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <a
            href="https://business.facebook.com/wa/manage/message-templates/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted/80 transition-colors"
          >
            <span>מעבר להקמת תבניות ב-Meta Business Manager</span>
            <ExternalLink className="size-3.5 text-muted-foreground" />
          </a>
          {waWebUrl && (
            <a
              href={waWebUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-status-done/10 border border-status-done/20 px-3 py-2 text-xs font-bold text-status-done hover:bg-status-done/20 transition-colors"
            >
              <MessageSquare className="size-3.5" />
              <span>שליחה חופשית דרך WhatsApp Web</span>
            </a>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 font-assistant" dir="rtl">
      {/* Template Selector with rich Hebrew metadata */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-muted-foreground">
            בחירת תבנית מאושרת
          </Label>
          <Badge variant="done" className="text-2xs py-0 px-2 h-5 flex items-center gap-1">
            <CheckCircle2 className="size-3" />
            <span>{filteredTemplates.length} תבניות מאושרות</span>
          </Badge>
        </div>

        <Select value={selectedTemplateId} onValueChange={onSelectTemplateId}>
          <SelectTrigger className="w-full text-right font-medium">
            <SelectValue placeholder="בחר תבנית מאושרת" />
          </SelectTrigger>
          <SelectContent align="end" className="max-h-72" dir="rtl">
            {filteredTemplates.map((tpl) => (
              <SelectItem key={tpl.id} value={tpl.id} className="text-right py-2 cursor-pointer">
                <div className="flex flex-col gap-0.5 text-right w-full">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-foreground">
                      {tpl.displayName}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="rounded bg-muted/60 px-1 py-0.2 text-2xs text-muted-foreground font-medium">
                        {tpl.language}
                      </span>
                      <span className="rounded bg-primary/10 px-1 py-0.2 text-2xs text-primary font-semibold">
                        {tpl.category}
                      </span>
                    </div>
                  </div>
                  <span className="text-2xs text-muted-foreground truncate">
                    {tpl.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Dynamic Template Parameters */}
      {currentTemplate && currentTemplate.params.length > 0 && (
        <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">שדות דינמיים בתבנית:</span>
            <span className="text-2xs text-muted-foreground">
              {currentTemplate.params.length} משתנים
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {currentTemplate.params.map((p, idx) => (
              <div key={p.index} className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>{p.label}</span>
                  <span className="font-mono text-2xs text-muted-foreground/80">{`{{${p.index}}}`}</span>
                  <span className="text-2xs text-muted-foreground/80 font-medium">{`{{${p.index}}}`}</span>
                </Label>
                <Input
                  value={paramValues[idx] ?? ''}
                  onChange={(e) => onParamChange(idx, e.target.value)}
                  placeholder={p.placeholder}
                  className="h-8 text-xs font-assistant"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live WhatsApp Chat Bubble Preview */}
      {currentTemplate && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-status-done/20 bg-status-done/5 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-status-done">
              <CheckCircle2 className="size-3.5" />
              <span className="text-xs font-bold">תצוגה מקדימה (WhatsApp):</span>
            </div>
            <Badge variant="outline" className="text-2xs py-0 px-1.5 h-4.5 text-muted-foreground">
              Meta Approved
            </Badge>
          </div>
          <p className="whitespace-pre-wrap text-xs text-foreground/90 leading-relaxed font-sans bg-card/80 p-2.5 rounded-md border border-border shadow-xs">
            {previewText}
          </p>
        </div>
      )}

      {/* Optional Bot Continuation Checkbox */}
      {showBotToggle && (
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/30 p-2.5">
          <Checkbox
            id="template-bot-continuation"
            checked={botContinuation}
            onCheckedChange={(checked) => onBotContinuationChange?.(Boolean(checked))}
          />
          <Label
            htmlFor="template-bot-continuation"
            className="text-xs font-semibold cursor-pointer select-none leading-tight"
          >
            {recipientDisplayName
              ? `הבוט ימשיך את השיחה כש${recipientDisplayName} תשיב`
              : 'הבוט ימשיך את השיחה כשהלקוח/ה תשיב'}
          </Label>
        </div>
      )}
    </div>
  )
}

