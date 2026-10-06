import React from 'react'
import { Needle, PencilLine } from '@/components/ui/icon'
import { MARKER_DOT, MARKER_LABELS } from '../utils/appointment-visual'

/**
 * What the calendar's four visual channels mean (track-b B6.8). It lives in a popover behind the
 * toolbar's info button rather than as a permanent strip under the grid, which cost ~40px of grid
 * height on every screen to explain something staff learn once.
 */
export const CalendarLegend: React.FC = () => {
  return (
    <div dir="rtl" className="flex flex-col gap-3 p-4 font-assistant text-xs">
      <p className="text-sm font-extrabold text-foreground">מקרא היומן</p>

      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex shrink-0 gap-0.5">
            <span className="size-3 rounded border border-artist-1/45 bg-artist-1/[0.08]" />
            <span className="size-3 rounded border border-artist-2/45 bg-artist-2/[0.08]" />
            <span className="size-3 rounded border border-artist-5/45 bg-artist-5/[0.08]" />
          </span>
          <span className="text-muted-foreground">
            <span className="font-bold text-foreground">צבע = מקעקע.</span> לכל מקעקע צבע קבוע משלו.
          </span>
        </div>

        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-artist-2/20 text-2xs font-extrabold leading-none ring-1 ring-artist-2/50">
            דח
          </span>
          <span className="text-muted-foreground">
            <span className="font-bold text-foreground">עיגול = מי המקעקע.</span> תמונת הפרופיל מגוגל, או ראשי תיבות בצבע שלו.
          </span>
        </div>

        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex shrink-0 gap-1 text-muted-foreground">
            <Needle size={13} />
            <PencilLine size={13} />
          </span>
          <span className="text-muted-foreground">
            <span className="font-bold text-foreground">אייקון = סוג.</span> מחט לסשן קעקוע, עיפרון לפגישת ייעוץ.
          </span>
        </div>

        <div className="flex items-start gap-2">
          <span className="mt-0.5 size-3 shrink-0 rounded border border-dashed border-muted-foreground/60" />
          <span className="text-muted-foreground">
            <span className="font-bold text-foreground">מסגרת מקווקוות = טרם אושר.</span> התור עוד לא סופי.
          </span>
        </div>

        <div className="flex items-start gap-2">
          <span className={`mt-1 size-2 shrink-0 rounded-full ${MARKER_DOT.approval}`} />
          <span className="text-muted-foreground">
            <span className="font-bold text-foreground">נקודה כהה = {MARKER_LABELS.approval}.</span>
          </span>
        </div>

        <div className="flex items-start gap-2">
          <span className={`mt-1 size-2 shrink-0 rounded-full ${MARKER_DOT.close_out}`} />
          <span className="text-muted-foreground">
            <span className="font-bold text-foreground">נקודה כתומה = {MARKER_LABELS.close_out}.</span> הסשן נגמר ולא הוזן מחיר סופי.
          </span>
        </div>

        <div className="flex items-start gap-2">
          <span className="mt-0.5 size-3 shrink-0 rounded border border-border bg-muted opacity-55" />
          <span className="text-muted-foreground">
            <span className="font-bold text-foreground">מעומעם = הושלם או בוטל.</span> תור שבוטל מוצג גם עם קו חוצה.
          </span>
        </div>
      </div>

      <p className="border-t border-border pt-2.5 text-2xs text-muted-foreground">
        מחיר, מקדמה, הצהרת בריאות ותיאור הקעקוע מופיעים כשמעבירים את העכבר על התור, ובפתיחת התור עצמו.
      </p>
    </div>
  )
}

export default CalendarLegend
