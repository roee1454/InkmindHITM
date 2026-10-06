import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar, ClipboardList, Clock, Database, KeyRound, MessageSquare, Sparkles } from '@/components/ui/icon'
import { cn } from '@/lib/utils'
import { POLICY_LABELS, collectionLabel } from '../utils/delete-messages'
import type { DeleteImpactItem, RelationPolicy } from '../types'

const ICONS: Record<string, React.ReactNode> = {
  conversations: <MessageSquare size={15} />,
  messages: <MessageSquare size={15} />,
  appointments: <Calendar size={15} />,
  waitlist_entries: <Clock size={15} />,
  credentials: <KeyRound size={15} />,
  mcp_conversations: <Sparkles size={15} />,
  mcp_messages: <Sparkles size={15} />,
  mcp_actions: <Sparkles size={15} />,
  audit_log: <ClipboardList size={15} />,
}

const GROUP_STYLES: Record<RelationPolicy, string> = {
  cascade: 'border-destructive/25 bg-destructive/5 text-destructive',
  nullify: 'border-border bg-muted/40 text-muted-foreground',
  restrict: 'border-warning/30 bg-warning/10 text-warning',
}

function ImpactGroup({ policy, items }: { policy: RelationPolicy; items: DeleteImpactItem[] }) {
  if (items.length === 0) return null
  return (
    <section className={cn('rounded-xl border p-3', GROUP_STYLES[policy])}>
      <h3 className="mb-2 text-xs font-bold">{POLICY_LABELS[policy]}</h3>
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={`${policy}-${item.collection}`} className="flex items-center justify-between gap-3 text-xs text-foreground">
            <span className="flex items-center gap-2">
              <span className="shrink-0 text-muted-foreground">{ICONS[item.collection] ?? <Database size={15} />}</span>
              {collectionLabel(item.collection)}
            </span>
            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-2xs font-bold">{item.count}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function DeleteImpactSummary({ items, label }: { items: DeleteImpactItem[]; label: string }) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-muted/30 p-3.5 text-xs text-muted-foreground">
        &quot;{label}&quot; אינו/ה מקושר/ת לנתונים נוספים במערכת.
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-2.5">
      <ImpactGroup policy="cascade" items={items.filter((i) => i.policy === 'cascade')} />
      <ImpactGroup policy="nullify" items={items.filter((i) => i.policy === 'nullify')} />
    </div>
  )
}

export function DeleteImpactSkeleton() {
  return (
    <div className="flex flex-col gap-2.5" aria-busy="true" aria-label="בודק נתונים מקושרים">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  )
}
