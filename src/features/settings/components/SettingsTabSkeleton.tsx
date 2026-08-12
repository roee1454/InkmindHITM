import { Skeleton } from '@/components/ui/skeleton'

/** Generic loading stand-in shared by every settings tab — a few labeled-field-shaped blocks
 *  plus a card, which is what every one of these screens ultimately boils down to. */
export function SettingsTabSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <div className="flex max-w-xl flex-col gap-5 font-assistant" dir="rtl">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
      <div className="card-native flex flex-col gap-3 p-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}

export default SettingsTabSkeleton
