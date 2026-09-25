import { useRef } from 'react'
import {
  Paperclip,
  SendHorizontal,
  X,
  Clock,
  ExternalLink,
  FileText,
} from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { UIMessage } from '../types'
import type { SelectedFile } from '../store/conversationsUiStore'
import { cn } from '@/lib/utils'

interface ConversationComposerProps {
  customerName: string
  customerPhone: string
  draft: string
  onDraftChange: (text: string) => void
  onSend: () => void
  isSending: boolean
  replyingTo: UIMessage | null
  onCancelReply: () => void
  selectedFile: SelectedFile | null
  onFileSelect: (file: SelectedFile | null) => void
  windowExpired: boolean
  onOpenSendTemplate: () => void
  isAwaitingCustomer?: boolean
  awaitingNotice?: string
}

export function ConversationComposer({
  customerName,
  customerPhone,
  draft,
  onDraftChange,
  onSend,
  isSending,
  replyingTo,
  onCancelReply,
  selectedFile,
  onFileSelect,
  windowExpired,
  onOpenSendTemplate,
  isAwaitingCustomer = false,
  awaitingNotice,
}: ConversationComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const cleanPhone = (customerPhone || '').replace(/\D/g, '')
  const waWebUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null
  const displayName = customerName || 'הלקוח/ה'

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (draft.trim() || selectedFile) {
        onSend()
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const commaIdx = result.indexOf(',')
      const base64 = commaIdx >= 0 ? result.slice(commaIdx + 1) : result
      const previewUrl = file.type.startsWith('image/') ? result : undefined
      onFileSelect({
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        base64,
        previewUrl,
      })
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex-shrink-0 bg-card border-t border-border font-assistant" dir="rtl">
      {/* 24-hour Window Expired Notice & Actions (Mockup State 4) */}
      {windowExpired && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:px-4 bg-muted/40 border-b border-border text-xs">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <Clock className="size-4" />
            </span>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-foreground">
                עברו 24 שעות מההודעה האחרונה של {displayName}
              </span>
              <span className="text-muted-foreground text-micro">
                מטא חוסמת הודעה חופשית עד ש{displayName} תשיב. יש לשלוח תבנית מאושרת.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              onClick={onOpenSendTemplate}
              className="h-8 gap-1.5 text-xs font-bold"
            >
              <FileText className="size-3.5" />
              <span>שליחת תבנית מאושרת</span>
            </Button>
            {waWebUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                asChild
                className="h-8 gap-1.5 text-xs font-semibold"
              >
                <a href={waWebUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-3.5 text-muted-foreground" />
                  <span>וואטסאפ ווב</span>
                </a>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Replying context bar & Selected file bar */}
      {(replyingTo || selectedFile) && (
        <div className="flex items-center gap-2 px-4 pt-2.5 flex-wrap">
          {replyingTo && (
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs">
              <span className="text-muted-foreground text-micro">משיב/ה:</span>
              <span className="max-w-48 truncate font-medium text-foreground">
                {replyingTo.body || 'קובץ מדיה'}
              </span>
              <button
                type="button"
                onClick={onCancelReply}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
                title="ביטול השבה"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          {selectedFile && (
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
              <Paperclip className="size-3.5 shrink-0" />
              <span className="max-w-48 truncate font-semibold">
                {selectedFile.filename}
              </span>
              <button
                type="button"
                onClick={() => {
                  onFileSelect(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="text-primary hover:text-primary/70 cursor-pointer"
                title="הסרת קובץ"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Composer Input Row */}
      {(() => {
        const isInputDisabled = windowExpired || isSending || isAwaitingCustomer
        const effectivePlaceholder = windowExpired
          ? 'לא ניתן לשלוח הודעה חופשית כרגע (חלון 24 שעות סגור)'
          : isAwaitingCustomer
            ? (awaitingNotice || 'לא ניתן להקליד כרגע (ממתין לפעולת הלקוח)')
            : 'כתיבת הודעה… (Enter לשליחה)'

        return (
          <div className="flex items-end gap-2 p-3 sm:px-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={isInputDisabled}
              onClick={() => fileInputRef.current?.click()}
              className="size-10 shrink-0 rounded-xl border-border text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer disabled:opacity-50"
              title="צירוף תמונה או קובץ"
            >
              <Paperclip className="size-4.5" />
            </Button>

            <div className="relative flex-1 min-w-0">
              <Textarea
                ref={textareaRef}
                rows={1}
                value={draft}
                disabled={isInputDisabled}
                onChange={(e) => onDraftChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={effectivePlaceholder}
                className="min-h-10 max-h-32 resize-none rounded-xl border-border bg-muted/30 py-2.5 px-3.5 text-xs sm:text-sm leading-relaxed placeholder:text-muted-foreground disabled:opacity-60 focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>

            <Button
              type="button"
              size="icon"
              disabled={isInputDisabled || (!draft.trim() && !selectedFile)}
              onClick={onSend}
              className={cn(
                'size-10 shrink-0 rounded-full bg-primary text-primary-foreground shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
              )}
              title="שליחת הודעה"
            >
              <SendHorizontal className="size-4.5 rotate-180" />
            </Button>
          </div>
        )
      })()}
    </div>
  )
}
