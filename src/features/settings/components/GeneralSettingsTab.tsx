import { useQuery } from '@tanstack/react-query'
import { getSettings } from '@/features/onboarding/server/onboarding'

/** Read-only summary for now — editing studio name/timezone/currency is a later pass.
 *  Present so the Settings page has an established multi-tab structure to grow into. */
export function GeneralSettingsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['settings-general'],
    queryFn: () => getSettings(),
  })

  if (isLoading) return <p className="text-sm text-muted-foreground">טוען…</p>

  const rows: { label: string; value: string }[] = [
    { label: 'שם הסטודיו', value: (data?.studio_name as string) || '—' },
    { label: 'אזור זמן', value: (data?.timezone as string) || '—' },
    { label: 'מטבע', value: (data?.currency as string) || '—' },
  ]

  return (
    <div className="max-w-xl space-y-3 font-assistant">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between border-b border-border py-2">
          <span className="text-sm text-muted-foreground">{r.label}</span>
          <span className="text-sm font-medium text-foreground">{r.value}</span>
        </div>
      ))}
      <p className="pt-2 text-xs text-muted-foreground">עריכת פרטים כלליים תתווסף בהמשך.</p>
    </div>
  )
}
