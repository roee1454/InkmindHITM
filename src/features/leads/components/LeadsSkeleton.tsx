import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export const LeadsSkeleton: React.FC = () => {
  return (
    <>
      {/* Desktop table skeleton */}
      <div className="hidden overflow-hidden rounded-3xl border border-border/80 bg-card shadow-xs font-assistant md:block" dir="rtl">
        <div className="border-b border-border/60 bg-muted/40 px-6 py-3.5 grid grid-cols-12 items-center">
          <Skeleton className="col-span-4 h-4 w-28" />
          <Skeleton className="col-span-3 h-4 w-24" />
          <Skeleton className="col-span-2 h-4 w-20" />
          <Skeleton className="col-span-2 h-4 w-20" />
          <Skeleton className="col-span-1 h-4 w-12 ms-auto" />
        </div>

        <div className="divide-y divide-border/60">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-12 items-center px-6 py-4">
              {/* Customer info */}
              <div className="col-span-4 flex items-center gap-3">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>

              {/* Artist */}
              <div className="col-span-3 flex items-center gap-2">
                <Skeleton className="size-6 shrink-0 rounded-full" />
                <Skeleton className="h-3.5 w-20" />
              </div>

              {/* Status badge */}
              <div className="col-span-2">
                <Skeleton className="h-7.5 w-28 rounded-full" />
              </div>

              {/* Date */}
              <div className="col-span-2">
                <Skeleton className="h-3.5 w-20" />
              </div>

              {/* Action */}
              <div className="col-span-1 flex justify-end">
                <Skeleton className="h-8 w-18 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile standalone cards skeleton */}
      <div className="flex flex-col gap-3 font-assistant md:hidden" dir="rtl">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
            {/* Top row */}
            <div className="flex items-center gap-3">
              <Skeleton className="size-11 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3.5 w-24" />
              </div>
              <Skeleton className="h-6 w-16 rounded-lg" />
            </div>

            {/* Middle row */}
            <div className="flex items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-16" />
            </div>

            {/* Bottom row */}
            <div className="flex items-center justify-between gap-2.5 pt-0.5">
              <Skeleton className="h-8.5 w-28 rounded-full" />
              <Skeleton className="h-9 w-22 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export default LeadsSkeleton

