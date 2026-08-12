import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function LeadsHeader({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="hidden items-center justify-between gap-4 px-1 pt-1 lg:flex">
      <div className="page-head">
        <h1>לידים פוטנציאלים</h1>
        {/* Dragging is desktop-only — touch users get the ⋮ menu on each card instead. */}
        <p>גררו כרטיס בין העמודות כדי לעדכן שלב.</p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
        <RefreshCw className="size-4" />
        רענן
      </Button>
    </div>
  )
}
