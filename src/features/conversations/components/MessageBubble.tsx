import { Check, CheckCheck, Clock, Download, MapPin, Reply, TriangleAlert } from '@/components/ui/icon'
import { cn } from '@/lib/utils'
import { messageMediaUrl } from '../utils/media'
import { formatTime } from '../utils/format'
import type { UIMessage } from '../types'

const STATUS_ICON: Record<string, typeof Check> = {
  sent: Check,
  delivered: CheckCheck,
  read: CheckCheck,
  failed: TriangleAlert,
}

type Speaker = 'customer' | 'bot' | 'staff' | 'note'

/** Who said it decides the bubble; the side only says which way it went. */
const SPEAKER_STYLE: Record<Speaker, string> = {
  customer: 'border border-border bg-card',
  bot: 'bg-muted',
  staff: 'bg-primary/15',
  // Never reached the customer: an outline with no fill, so it can't be mistaken for a sent message.
  note: 'border border-dashed border-border text-muted-foreground',
}

const SPEAKER_LABEL: Partial<Record<Speaker, string>> = {
  bot: 'בוט',
  staff: 'צוות',
  note: 'הנחיה לבוט · לא נשלחה ללקוח',
}

function speakerOf(message: UIMessage): Speaker {
  if (message.senderType === 'staff' && message.whatsappMessageId?.startsWith('internal_staff_')) return 'note'
  if (message.senderType === 'ai_bot') return 'bot'
  if (message.senderType === 'staff') return 'staff'
  return 'customer'
}

interface MessageBubbleProps {
  message: UIMessage
  onReply?: (message: UIMessage) => void
  onImageClick?: (url: string) => void
}

export function MessageBubble({ message, onReply, onImageClick }: MessageBubbleProps) {
  const speaker = speakerOf(message)
  const outbound = message.direction === 'outbound'
  const failed = message.status === 'failed'
  const StatusIcon = message.status ? (STATUS_ICON[message.status] ?? Clock) : null
  const label = SPEAKER_LABEL[speaker]

  return (
    // In RTL, `justify-start` is the right edge (the studio's side) and `justify-end` the left (the customer's).
    <div className={cn('group flex items-center gap-1', outbound ? 'justify-start' : 'justify-end')}>
      <div
        className={cn(
          'max-w-[85%] rounded-xl px-3 py-2 text-sm text-foreground sm:max-w-[70%]',
          outbound ? 'rounded-ss-sm' : 'rounded-se-sm',
          SPEAKER_STYLE[speaker],
        )}
      >
        {label && <p className="mb-0.5 text-xs font-semibold text-muted-foreground">{label}</p>}
        {message.replyToWamid && <p className="mb-1.5 rounded-md bg-foreground/5 px-2 py-1 text-xs text-muted-foreground">בתשובה להודעה</p>}
        <MessageBody message={message} onImageClick={onImageClick} />
        <p className="mt-1 flex items-center justify-end gap-1 text-xs text-muted-foreground tabular-nums" title={failed ? (message.errorDetail ?? undefined) : undefined}>
          {failed && <span className="font-semibold text-destructive">לא נשלחה</span>}
          {outbound && StatusIcon && speaker !== 'note' && (
            <StatusIcon className={cn('size-3.5 shrink-0', message.status === 'read' && 'text-foreground', failed && 'text-destructive')} />
          )}
          <time dateTime={message.timestamp}>{formatTime(message.timestamp)}</time>
        </p>
      </div>

      {onReply && speaker !== 'note' && (
        <button
          type="button"
          onClick={() => onReply(message)}
          aria-label="תשובה להודעה"
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100 pointer-coarse:opacity-60"
        >
          <Reply className="size-4" />
        </button>
      )}
    </div>
  )
}

function MessageBody({ message, onImageClick }: { message: UIMessage; onImageClick?: (url: string) => void }) {
  const mediaUrl = message.mediaFilename ? messageMediaUrl(message.id, message.mediaFilename) : null
  const caption = message.body ? <p className="whitespace-pre-wrap break-words">{message.body}</p> : null

  if (message.type === 'image' && mediaUrl) {
    return (
      <div className="flex flex-col gap-1">
        <button type="button" onClick={() => onImageClick?.(mediaUrl)} className="relative block cursor-zoom-in overflow-hidden rounded-lg" aria-label="הגדלת התמונה">
          <img src={mediaUrl} alt={message.body || 'תמונה'} className="max-h-64 rounded-lg object-cover" />
          {message.mediaCategory && (
            <span className="pointer-events-none absolute start-2 bottom-2 rounded-md bg-background/85 px-1.5 py-0.5 text-xs font-semibold text-foreground">
              {message.mediaCategory === 'verification' ? 'אסמכתה' : 'השראה'}
            </span>
          )}
        </button>
        {caption}
      </div>
    )
  }

  if (message.type === 'video' && mediaUrl) {
    return (
      <div className="flex flex-col gap-1">
        <video src={mediaUrl} controls className="max-h-64 rounded-lg" />
        {caption}
      </div>
    )
  }

  if (message.type === 'audio' && mediaUrl) return <audio src={mediaUrl} controls className="max-w-full" />

  if ((message.type === 'document' || message.type === 'sticker') && mediaUrl) {
    return (
      <a href={mediaUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline underline-offset-2">
        <Download className="size-4 shrink-0" />
        <span className="break-all">{message.mediaFilename}</span>
      </a>
    )
  }

  if (message.type === 'location') {
    return (
      <p className="flex items-center gap-1">
        <MapPin className="size-4 shrink-0" />
        <span className="whitespace-pre-wrap break-words">{message.body || 'מיקום'}</span>
      </p>
    )
  }

  return <p className="whitespace-pre-wrap break-words">{message.body}</p>
}
