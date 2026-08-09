import React from 'react'
import { Star, MessageSquare, Edit3, Trash2 } from 'lucide-react'
import type { Customer } from '../types'
import { SOURCE_LABELS, AVATAR_COLORS } from '../types'

interface CustomerCardProps {
  customer: Customer
  colorIndex: number
  onEdit: (customer: Customer) => void
  onDelete: (id: string) => void
}

export const CustomerCard: React.FC<CustomerCardProps> = ({
  customer: c,
  colorIndex,
  onEdit,
  onDelete,
}) => {
  const displayName = c.name || 'לקוח ללא שם'
  const initial = displayName.charAt(0)
  const colorClass = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length]
  const sourceLabel = SOURCE_LABELS[c.source || 'unknown']

  return (
    <div
      className="bg-card border border-border rounded-xl relative shadow-sm transition-all hover:border-primary/30 font-assistant"
      dir="rtl"
    >
      {/* MOBILE SIMPLIFIED VIEW (<md) */}
      <div className="flex md:hidden items-center justify-between p-3 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 ${colorClass}`}>
            {initial}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1 min-w-0">
              <h4 className="text-sm font-bold text-foreground truncate">{displayName}</h4>
              {c.isVip && (
                <Star size={12} className="text-amber-400 fill-amber-400 shrink-0" />
              )}
              {c.visits >= 2 && (
                <span className="text-[9px] font-bold bg-indigo-500/10 text-indigo-400 px-1.5 py-0.2 rounded-full shrink-0">
                  חוזר
                </span>
              )}
            </div>
            <span className="text-mini text-muted-foreground truncate block mt-0.5">
              ₪{c.totalSpend.toLocaleString()} • {c.visits} ביקורים
              {c.phone ? ` • ${c.phone}` : ''}
            </span>
          </div>
        </div>

        {/* Action buttons on mobile */}
        <div className="flex items-center gap-1.5 shrink-0">
          {(c.chatId || c.phone) && (
            <a
              href={c.chatId ? `/conversations?chatId=${c.chatId}` : `https://web.whatsapp.com/send?phone=${c.phone}`}
              target={c.chatId ? undefined : '_blank'}
              rel={c.chatId ? undefined : 'noopener noreferrer'}
              className="flex size-8 items-center justify-center bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors"
              title="ווצאפ"
            >
              <MessageSquare size={13} />
            </a>
          )}
          <button
            type="button"
            onClick={() => onEdit(c)}
            className="flex size-8 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="ערוך"
          >
            <Edit3 size={13} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('האם אתה בטוח שברצונך למחוק לקוח זה?')) {
                onDelete(c.id)
              }
            }}
            className="flex size-8 items-center justify-center rounded-lg border border-border bg-card hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-colors cursor-pointer"
            title="מחק"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* DESKTOP VIEW (>=md) */}
      <div className="hidden md:flex flex-col justify-between gap-3 p-4">
        {/* Top Row: Avatar + Info + Badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 ${colorClass}`}>
              {initial}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-bold text-foreground truncate">{displayName}</h4>
                {c.isVip && (
                  <span title="לקוח VIP">
                    <Star size={13} className="text-amber-400 fill-amber-400 shrink-0" />
                  </span>
                )}
              </div>
              <span className="text-mini text-muted-foreground truncate block mt-0.5">
                {c.phone ? <span className="dir-ltr font-mono">{c.phone}</span> : null}
                {c.phone && sourceLabel ? ' • ' : ''}
                {sourceLabel}
              </span>
            </div>
          </div>

          {c.visits >= 2 && (
            <span className="text-micro font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full shrink-0">
              חוזר
            </span>
          )}
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 border border-border/50 p-2 rounded-lg">
          <div className="flex items-center justify-between px-1">
            <span className="text-micro text-muted-foreground font-semibold">ביקורים</span>
            <span className="font-bold text-foreground">{c.visits}</span>
          </div>
          <div className="flex items-center justify-between px-1 border-r border-border/50 pr-2">
            <span className="text-micro text-muted-foreground font-semibold">הוצאה</span>
            <span className="font-bold text-foreground">₪{c.totalSpend.toLocaleString()}</span>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-between pt-1 border-t border-border/40">
          {(c.chatId || c.phone) ? (
            <a
              href={c.chatId ? `/conversations?chatId=${c.chatId}` : `https://web.whatsapp.com/send?phone=${c.phone}`}
              target={c.chatId ? undefined : '_blank'}
              rel={c.chatId ? undefined : 'noopener noreferrer'}
              className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-mini font-bold px-2 py-1 rounded-md transition-colors"
            >
              <MessageSquare size={12} /> ווצאפ
            </a>
          ) : <div />}

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(c)}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="ערוך לקוח"
            >
              <Edit3 size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('האם אתה בטוח שברצונך למחוק לקוח זה?')) {
                  onDelete(c.id)
                }
              }}
              className="p-1 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-colors cursor-pointer"
              title="מחק לקוח"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerCard