export type StaffRole = 'owner' | 'admin' | 'staff'

export interface StaffRecord {
  id: string
  email: string
  role: StaffRole
  name: string
  phone: string
  avatar: string
  active: boolean
  calendar_feed_token: string
  created: string
  updated: string
}

export interface ArtistProfileRecord {
  id: string
  staff: string
  portfolio_website: string
  portfolio_instagram: string
  portfolio_facebook: string
  tattoo_styles: string[]
  bio: string
  work_hours: WorkHoursWindow[]
  created: string
  updated: string
}

export interface WorkHoursWindow {
  day_of_week: number // 0 = Sunday .. 6 = Saturday
  start_time: string // "HH:MM"
  end_time: string // "HH:MM"
}

export interface CredentialRecord {
  id: string
  staff: string
  provider: 'google_calendar'
  google_calendar_id: string
  token_expires_at: string
  scope: string
  connected_at: string
}

export interface SettingsRecord {
  id: string
  studio_name: string
  timezone: string
  currency: string
  onboarding_completed: boolean
  [key: string]: unknown
}
