import { Check, CheckCheck, Clock, Download, MapPin, Reply, TriangleAlert } from 'lucide-react'
import { messageMediaUrl } from '../lib/media'
import { formatTime } from '../lib/format'
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
  onCategoryToggle?: (messageId: string, currentCategory: 'inspiration' | 'verification' | null) => void
}

export function MessageBubble({ message, onReply, onImageClick, onCategoryToggle }: MessageBubbleProps) {
  const outbound = message.direction === 'outbound'
  const StatusIcon = message.status ? (STATUS_ICON[message.status] ?? Clock) : null

  return (
    <div className={`group relative flex ${outbound ? 'justify-end' : 'justify-start'} items-center gap-2`}>
      {/* Reply trigger button */}
      {onReply && (
        <button
          type="button"
          onClick={() => onReply(message)}
          className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground cursor-pointer ${
            outbound ? 'order-first' : 'order-last'
          }`}
          title="השב להודעה זו"
        >
          <Reply className="size-3.5" />
        </button>
      )}

      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 font-assistant text-sm shadow-sm sm:max-w-[75%] ${
          outbound
            ? 'bg-primary text-primary-foreground'
            : 'border border-border bg-card text-foreground'
        }`}
      >
        {/* Reply Context Banner */}
        {message.replyToWamid && (
          <div
            className={`mb-1.5 rounded-lg border-r-2 p-1.5 text-xs ${
              outbound
                ? 'border-primary-foreground/60 bg-primary-foreground/10 text-primary-foreground/90'
                : 'border-primary bg-muted/60 text-muted-foreground'
            }`}
          >
            <span className="block font-semibold text-micro">בתשובה להודעה</span>
          </div>
        )}

        <MessageBody
          message={message}
          onImageClick={onImageClick}
          onCategoryToggle={onCategoryToggle}
        />

        <div
          className={`mt-1 flex items-center justify-end gap-1 text-micro ${
            outbound ? 'text-primary-foreground/70' : 'text-muted-foreground'
          }`}
        >
          <span>{formatTime(message.timestamp)}</span>
          {outbound && StatusIcon ? (
            <StatusIcon
              className={`size-3 ${message.status === 'read' ? 'text-sky-300' : ''} ${
                message.status === 'failed' ? 'text-destructive' : ''
              }`}
            />
          ) : null}
        </div>

        {message.status === 'failed' && message.errorDetail ? (
          <p className="mt-1 text-micro text-destructive">{message.errorDetail}</p>
        ) : null}
      </div>
    </div>
  )
}

function MessageBody({
  message,
  onImageClick,
  onCategoryToggle,
}: {
  message: UIMessage
  onImageClick?: (url: string, category: 'inspiration' | 'verification' | null) => void
  onCategoryToggle?: (messageId: string, currentCategory: 'inspiration' | 'verification' | null) => void
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
          {onCategoryToggle && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onCategoryToggle(message.id, message.mediaCategory)
              }}
              className="absolute bottom-2 right-2 px-2 py-1 rounded-full text-micro font-bold shadow-xs backdrop-blur-md bg-background/80 hover:bg-background border border-border/40 transition select-none text-foreground cursor-pointer flex items-center gap-1 opacity-0 group-hover/image:opacity-100 focus:opacity-100 transition-opacity duration-200"
            >
              {isVerification ? '📁 אסמכתא' : '✨ השראה'}
            </button>
          )}
        </div>
        {message.body ? <p className="whitespace-pre-wrap break-words">{message.body}</p> : null}
      </div>
    )
  }

  if ((message.type === 'video') && mediaUrl) {
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
