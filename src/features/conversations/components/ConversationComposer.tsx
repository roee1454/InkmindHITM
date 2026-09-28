import { useRef } from 'react'
import { Clock, Paperclip, SendHorizontal, X } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { UIMessage } from '../types'
import type { SelectedFile } from '../store/conversationsUiStore'

interface ConversationComposerProps {
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
  /** Set while the customer is the one who has to act; the composer is closed and says on what. */
  awaitingNotice?: string
}

function Attachment({ label, value, onRemove, removeLabel }: { label: string; value: string; onRemove: () => void; removeLabel: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-muted py-1 ps-2.5 pe-1 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate font-semibold text-foreground">{value}</span>
      <button type="button" onClick={onRemove} aria-label={removeLabel} className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground">
        <X className="size-3.5" />
      </button>
    </span>
  )
}

export function ConversationComposer({
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
  awaitingNotice,
}: ConversationComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const closed = windowExpired || Boolean(awaitingNotice)
  const canSend = !closed && !isSending && (draft.trim().length > 0 || selectedFile !== null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (canSend) onSend()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const commaIdx = result.indexOf(',')
      onFileSelect({
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        base64: commaIdx >= 0 ? result.slice(commaIdx + 1) : result,
        previewUrl: file.type.startsWith('image/') ? result : undefined,
      })
    }
    reader.readAsDataURL(file)
  }

  const removeFile = () => {
    onFileSelect(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="px-3 py-3 font-assistant sm:px-4" dir="rtl">
      {windowExpired && (
        <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <Clock className="size-4 shrink-0 text-muted-foreground" />
          <p className="min-w-0 flex-1 text-muted-foreground">
            <span className="font-semibold text-foreground">חלון 24 השעות נסגר.</span> עד שהלקוח יכתוב שוב, אפשר לשלוח רק תבנית מאושרת.
          </p>
          <Button size="sm" onClick={onOpenSendTemplate} className="h-9">
            שליחת תבנית
          </Button>
        </div>
      )}

      {(replyingTo || selectedFile) && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {replyingTo && <Attachment label="תשובה ל:" value={replyingTo.body || 'קובץ'} onRemove={onCancelReply} removeLabel="ביטול התשובה" />}
          {selectedFile && <Attachment label="קובץ:" value={selectedFile.filename} onRemove={removeFile} removeLabel="הסרת הקובץ" />}
        </div>
      )}

      <div className="flex items-end gap-2">
        <input ref={fileInputRef} type="file" accept="image/*,video/*,application/pdf" onChange={handleFileChange} className="hidden" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={closed || isSending}
          onClick={() => fileInputRef.current?.click()}
          aria-label="צירוף תמונה או קובץ"
          className="size-10 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Paperclip className="size-5" />
        </Button>

        <Textarea
          rows={1}
          value={draft}
          disabled={closed || isSending}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="הודעה ללקוח"
          placeholder={windowExpired ? 'החלון סגור' : awaitingNotice || 'הודעה ללקוח'}
          className="max-h-32 min-h-10 flex-1 resize-none rounded-xl py-2.5 text-sm leading-relaxed md:min-h-10"
        />

        <Button type="button" size="icon" disabled={!canSend} onClick={onSend} aria-label="שליחה" className="size-10 rounded-xl">
          <SendHorizontal className="size-5 rotate-180" />
        </Button>
      </div>
    </div>
  )
}
