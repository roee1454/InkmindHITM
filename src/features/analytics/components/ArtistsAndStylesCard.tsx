import React from 'react'
import type { ArtistStat, StudioHealthStats, TattooStyleStat } from '../types'

interface ArtistsAndStylesCardProps {
  artists: ArtistStat[]
  styles?: TattooStyleStat[]
  health: StudioHealthStats
}

export const ArtistsAndStylesCard: React.FC<ArtistsAndStylesCardProps> = ({
  artists,
  health,
}) => {
  return (
    <div className="card-native overflow-hidden font-assistant">
      {/* Header */}
      <div className="flex flex-col gap-1 border-b border-border/60 px-5 pt-4 pb-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:pt-5">
        <div>
          <h3 className="text-base font-extrabold text-foreground">ביצועים לפי מקעקע</h3>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">
            פילוח פניות, תורים שנקבעו והכנסות לפי כל אמן בסטודיו
          </p>
        </div>
        {artists.length > 0 && (
          <span className="self-start sm:self-auto rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground tabular-nums">
            {artists.length} אמנים פעילים
          </span>
        )}
      </div>

      {/* Artists List */}
      <div className="min-h-[160px]">
        {artists.length > 0 ? (
          <div className="divide-y divide-border/60">
            {artists.map((artist) => (
              <div
                key={artist.staffId}
                className="flex flex-col gap-2 px-5 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-3.5"
              >
                {/* Mobile top / Desktop right: Artist Name & Leads */}
                <div className="flex items-center justify-between sm:justify-start sm:gap-3">
                  <span className="text-sm font-extrabold text-foreground">{artist.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {artist.leadsCount} פניות מוקצות
                  </span>
                </div>

                {/* Mobile bottom / Desktop left: Stats */}
                <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground tabular-nums sm:justify-end sm:gap-8">
                  <div className="flex items-center gap-1.5">
                    <span className="sm:hidden text-micro text-muted-foreground">תורים:</span>
                    <span className="font-semibold text-foreground">
                      {artist.bookedCount} תורים
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="sm:hidden text-micro text-muted-foreground">המרה:</span>
                    <span className="font-bold text-foreground">
                      {artist.conversionRate}% המרה
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="sm:hidden text-micro text-muted-foreground">הכנסה:</span>
                    <span className="font-bold text-foreground">
                      {artist.revenueIls > 0 ? `₪${artist.revenueIls.toLocaleString()}` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <p className="text-sm font-bold text-foreground">אין נתוני מקעקעים לתקופה שנבחרה</p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              שיוך פניות ותורים למקעקעים יופיע כאן אוטומטית
            </p>
          </div>
        )}
      </div>

      {/* Studio Operational Health Footer */}
      <div className="border-t border-border/60 bg-muted/20 px-5 py-3 text-xs sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 text-muted-foreground">
          <div className="space-y-0.5">
            <span className="block text-2xs font-medium text-muted-foreground">זמן ממוצע לשריון</span>
            <span className="font-bold tabular-nums text-foreground">
              {health.avgTimeToBookHours > 0
                ? health.avgTimeToBookHours < 24
                  ? `${health.avgTimeToBookHours} שעות`
                  : `${Math.round(health.avgTimeToBookHours / 24)} ימים`
                : '—'}
            </span>
          </div>
          <div className="space-y-0.5">
            <span className="block text-2xs font-medium text-muted-foreground">סקיצה מול קעקוע</span>
            <span className="font-bold tabular-nums text-foreground">
              {health.sketchAppointmentsCount} סקיצה / {health.tattooAppointmentsCount} קעקוע
            </span>
          </div>
          <div className="space-y-0.5">
            <span className="block text-2xs font-medium text-muted-foreground">שיעור ביטולים</span>
            <span className="font-bold tabular-nums text-foreground">
              {health.cancellationRate}%
            </span>
          </div>
          <div className="space-y-0.5">
            <span className="block text-2xs font-medium text-muted-foreground">השתלטות שיחה ידנית</span>
            <span className="font-bold tabular-nums text-foreground">
              {health.humanTakeoverRate}% מהשיחות
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
