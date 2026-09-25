import { Bot, Check, CheckCheck, Clock, Download, MapPin, Reply, Sparkles, TriangleAlert } from '@/components/ui/icon'
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

interface MessageBubbleProps {
  message: UIMessage
  onReply?: (message: UIMessage) => void
  onImageClick?: (url: string, category: 'inspiration' | 'verification' | null) => void
}

export function MessageBubble({ message, onReply, onImageClick }: MessageBubbleProps) {
  const isInternalStaffInstruction = Boolean(
    message.senderType === 'staff' && message.whatsappMessageId?.startsWith('internal_staff_'),
  )
  const isBot = message.senderType === 'ai_bot'
  const isStaff = message.senderType === 'staff' && !isInternalStaffInstruction
  const outbound = message.direction === 'outbound'
  const StatusIcon = message.status ? (STATUS_ICON[message.status] ?? Clock) : null

  return (
    // Under dir="rtl", `justify-start` lands on the visual right (outbound/studio messages),
    // and `justify-end` lands on the visual left (inbound customer messages).
    <div className={`group relative flex ${outbound ? 'justify-start' : 'justify-end'} items-center gap-2 font-assistant`}>
      {/* Reply trigger button */}
      {onReply && !isInternalStaffInstruction && (
        <button
          type="button"
          onClick={() => onReply(message)}
          className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground cursor-pointer ${
            outbound ? 'order-last' : 'order-first'
          }`}
          title="השב להודעה זו"
        >
          <Reply className="size-3.5" />
        </button>
      )}

      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-xs sm:max-w-[75%]',
          outbound ? 'rounded-ss-xs' : 'rounded-se-xs',
          isInternalStaffInstruction
            ? 'border border-accent-ink/30 bg-accent-ink/10 text-foreground'
            : isStaff
              ? 'bg-primary text-primary-foreground'
              : 'border border-border bg-card text-foreground',
        )}
      >
        {/* Bot header badge */}
        {isBot && (
          <div className="mb-1 flex items-center gap-1.5 text-2xs font-extrabold text-primary">
            <Bot className="size-3.5" />
            <span>בוט</span>
          </div>
        )}

        {/* Staff header badge */}
        {isStaff && (
          <div className="mb-1 text-2xs font-bold text-primary-foreground/85">
            <span>צוות</span>
          </div>
        )}

        {/* Internal Staff Instruction Badge */}
        {isInternalStaffInstruction && (
          <div className="mb-1 flex items-center gap-1 text-micro font-bold text-accent-ink">
            <Sparkles className="size-3 shrink-0" />
            <span>הנחיית צוות לבוט (פנימי)</span>
          </div>
        )}

        {/* Reply Context Banner */}
        {message.replyToWamid && (
          <div
            className={cn(
              'mb-1.5 rounded-lg border-r-2 p-1.5 text-xs',
              isStaff
                ? 'border-primary-foreground/60 bg-primary-foreground/10 text-primary-foreground/90'
                : 'border-primary bg-muted/60 text-muted-foreground',
            )}
          >
            <span className="block font-semibold text-micro">בתשובה להודעה</span>
          </div>
        )}

        <MessageBody
          message={message}
          onImageClick={onImageClick}
        />

        <div
          className={cn(
            'mt-1 flex items-center justify-end gap-1 text-micro tabular-nums',
            isInternalStaffInstruction
              ? 'text-accent-ink/70'
              : isStaff
                ? 'text-primary-foreground/75'
                : 'text-muted-foreground',
          )}
        >
          {isInternalStaffInstruction ? (
            <span className="font-semibold text-accent-ink">פנימי</span>
          ) : (
            <>
              {outbound && StatusIcon && (
                <StatusIcon
                  className={cn(
                    'size-3 shrink-0',
                    message.status === 'read'
                      ? isStaff ? 'text-primary-foreground' : 'text-primary'
                      : message.status === 'failed'
                        ? 'text-destructive'
                        : '',
                  )}
                />
              )}
              <span>{formatTime(message.timestamp)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function MessageBody({
  message,
  onImageClick,
}: {
  message: UIMessage
  onImageClick?: (url: string, category: 'inspiration' | 'verification' | null) => void
}) {
  const hasMedia = Boolean(message.mediaFilename)
  const mediaUrl = hasMedia ? messageMediaUrl(message.id, message.mediaFilename!) : null

  if (message.type === 'image' && mediaUrl) {
    const isVerification = message.mediaCategory === 'verification'
    return (
      <div className="space-y-1 relative group/image">
        <div
          onClick={() => onImageClick?.(mediaUrl, message.mediaCategory)}
          className="cursor-pointer relative overflow-hidden rounded-lg animate-in fade-in zoom-in duration-200"
        >
          <img
            src={mediaUrl}
            alt={message.body || 'תמונה'}
            className="max-h-64 rounded-lg object-cover"
          />
          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-micro font-extrabold shadow-sm backdrop-blur-md border border-border bg-muted/80 text-muted-foreground select-none pointer-events-none flex items-center gap-1 opacity-90">
            {isVerification ? '🧾 אסמכתה' : '🎨 השראה'}
          </span>
        </div>
        {message.body ? <p className="whitespace-pre-wrap break-words">{message.body}</p> : null}
      </div>
    )
  }

  if (message.type === 'video' && mediaUrl) {
    return (
      <div className="space-y-1">
        <video src={mediaUrl} controls className="max-h-64 rounded-lg" />
        {message.body ? <p className="whitespace-pre-wrap break-words">{message.body}</p> : null}
      </div>
    )
  }

  if (message.type === 'audio' && mediaUrl) {
    return <audio src={mediaUrl} controls className="max-w-full" />
  }

  if ((message.type === 'document' || message.type === 'sticker') && mediaUrl) {
    return (
      <a
        href={mediaUrl}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 underline underline-offset-2"
      >
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
