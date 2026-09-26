import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDatabaseError } from '@/lib/pocketbase-error'
import { listOpenProjects } from '@/features/projects/server/projects'
import { PROJECT_STAGE_LABELS } from '@/features/projects/utils/labels'
import { defaultProjectChoice } from '@/features/projects/utils/project-choice'

const NEW_PROJECT = 'new'

/**
 * Which project the appointment belongs to, when the customer already has open ones: the next
 * session of a piece under way joins it instead of opening a second project. `projectId` is
 * undefined until chosen; the default is filled in once the customer's projects load.
 */
export function ProjectPicker({
  customerId,
  projectId,
  onChange,
}: {
  customerId: string | null
  projectId: string | null | undefined
  onChange: (projectId: string | null) => void
}) {
  const projects = useQuery({
    queryKey: ['open-projects', customerId],
    queryFn: () => listOpenProjects({ data: { customerId: customerId ?? '' } }),
    enabled: Boolean(customerId),
  })

  useEffect(() => {
    if (projectId === undefined && projects.data) onChange(defaultProjectChoice(projects.data))
  }, [projectId, projects.data, onChange])

  if (!customerId) return null
  if (projects.isLoading) return <Skeleton className="h-9 w-full" />
  if (projects.isError) {
    return <p className="text-xs text-destructive">{formatDatabaseError(projects.error, 'לא הצלחנו לטעון את הפרויקטים של הלקוח. התור ייפתח כפרויקט חדש.')}</p>
  }
  if (!projects.data?.length) return null

  return (
    <div className="flex flex-col gap-1.5" dir="rtl">
      <label className="text-xs font-bold text-foreground">פרויקט</label>
      <Select value={projectId ?? NEW_PROJECT} onValueChange={(value) => onChange(value === NEW_PROJECT ? null : value)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {projects.data.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {`המשך: ${project.title} · ${PROJECT_STAGE_LABELS[project.stage]}`}
            </SelectItem>
          ))}
          <SelectItem value={NEW_PROJECT}>פרויקט חדש (עבודה נפרדת)</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-2xs text-muted-foreground">סשן נוסף באותו קעקוע שייך לאותו פרויקט, כדי שהשלב, התשלומים והבוט יראו עבודה אחת.</p>
    </div>
  )
}
