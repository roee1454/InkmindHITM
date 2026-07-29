import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function LeadsHeader({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">לידים פוטנציאלים</h1>
        <p className="text-xs text-muted-foreground mt-1">גררו כרטיס בין העמודות כדי לעדכן שלב.</p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
        <RefreshCw className="size-4" />
        רענן
      </Button>
    </div>
  )
}
