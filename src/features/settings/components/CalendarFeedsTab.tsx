import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { getStaffList, getCurrentStaffInfo, type StaffMember, type CurrentStaffInfo } from '../server/settings'
import { GoogleCalendarConnection } from './GoogleCalendarConnection'

export const CalendarFeedsTab: React.FC = () => {
  const { data: currentStaff } = useQuery<CurrentStaffInfo>({
    queryKey: ['current-staff-info'],
    queryFn: () => getCurrentStaffInfo(),
  })

  const { data: staff = [], isLoading } = useQuery<StaffMember[]>({
    queryKey: ['staff-list'],
    queryFn: () => getStaffList(),
  })

  return (
    <div className="grid grid-cols-1 gap-6 font-assistant text-right lg:grid-cols-12" dir="rtl">
      <div className="space-y-1 lg:col-span-5">
        <h3 className="text-sm md:text-base font-bold text-foreground">סנכרון Google Calendar</h3>
        <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
          חברו את יומני ה-Google Calendar של חברי הצוות. הבוט יבדוק פניות ביומן בזמן אמת ולא יקבע
          תורים בזמנים תפוסים.
        </p>
      </div>

      <div className="space-y-3 lg:col-span-7">
        {isLoading ? (
          <p className="text-xs font-semibold text-muted-foreground">טוען צוות…</p>
        ) : (
          <div className="space-y-3">
            {staff.map((member) => (
              <GoogleCalendarConnection
                key={member.id}
                staffId={member.id}
                staffName={member.name}
                staffRole={member.role}
                isSelf={currentStaff?.id === member.id}
              />
            ))}

            {staff.length === 0 && (
              <p className="text-xs text-muted-foreground">אין חברי צוות במערכת.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default CalendarFeedsTab
