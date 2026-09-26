import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

/** Matches LeadsWithoutProjectList's row shape — a simple list, not a table (track-b B6.7:
 *  the leads page has no pipeline, so it doesn't need the projects table skeleton). */
export const LeadsSkeleton: React.FC = () => {
  return (
    <div className="card-native overflow-hidden font-assistant" dir="rtl">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="row-native justify-between">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-9 w-20 rounded-xl" />
        </div>
      ))}
    </div>
  )
}

export default LeadsSkeleton
