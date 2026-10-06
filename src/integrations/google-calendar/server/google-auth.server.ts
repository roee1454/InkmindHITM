import { calendar  } from '@googleapis/calendar'
import type {calendar_v3} from '@googleapis/calendar';
import { OAuth2Client } from 'google-auth-library'
import type { Credentials } from 'google-auth-library'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import type { TimeInterval } from '@/lib/time-intervals'
import { STUDIO_TIMEZONE } from '@/lib/timezone'

export interface CalendarOAuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: string
  googleAccountEmail: string
  googleAccountPicture: string | null
}

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
]

function getOAuth2Config() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || ''
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || ''
  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT_URI ||
    process.env.GOOGLE_REDIRECT_URI ||
    'http://localhost:3101/api/google-calendar/oauth/callback'

  return { clientId, clientSecret, redirectUri }
}

export function packOAuthState(staffId: string, origin: string): string {
  const payload = JSON.stringify({ staffId, origin, ts: Date.now() })
  return Buffer.from(payload).toString('base64url')
}

export function unpackOAuthState(state: string): { staffId: string; origin: string } | null {
  try {
    const raw = Buffer.from(state, 'base64url').toString('utf-8')
    const parsed = JSON.parse(raw)
    if (typeof parsed?.staffId === 'string' && typeof parsed?.origin === 'string') {
      return { staffId: parsed.staffId, origin: parsed.origin }
    }
    return null
  } catch {
    return null
  }
}

export function newOAuthClient(): OAuth2Client {
  const { clientId, clientSecret, redirectUri } = getOAuth2Config()
  return new OAuth2Client(clientId, clientSecret, redirectUri)
}

export function getAuthUrl(state: string): string {
  const client = newOAuthClient()
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
  })
}

export async function exchangeCode(code: string): Promise<CalendarOAuthTokens> {
  const client = newOAuthClient()
  const { tokens } = await client.getToken(code)

  if (!tokens.refresh_token || !tokens.access_token) {
    throw new Error('Google did not return a refresh token. Please re-consent.')
  }

  client.setCredentials(tokens)
  const { data: userInfo } = await client.request<{ email?: string; picture?: string }>({
    url: 'https://www.googleapis.com/oauth2/v2/userinfo',
  })

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600_000).toISOString(),
    googleAccountEmail: userInfo.email ?? '',
    googleAccountPicture: userInfo.picture ?? null,
  }
}

export async function saveGoogleCredentials(staffId: string, tokens: CalendarOAuthTokens): Promise<void> {
  const su = await getSuperuserClient()
  const studio = await su.collection('studios').getFirstListItem('').catch(() => null)

  const existing = await su
    .collection('credentials')
    .getFirstListItem(`staff = "${staffId}" && provider = "google_calendar"`)
    .catch(() => null)

  const recordData = {
    staff: staffId,
    studio: studio?.id || '',
    provider: 'google_calendar',
    google_calendar_id: tokens.googleAccountEmail || 'primary',
    google_account_email: tokens.googleAccountEmail,
    google_account_picture: tokens.googleAccountPicture,
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    token_expires_at: tokens.expiresAt,
    scope: SCOPES.join(' '),
  }

  if (existing) {
    await su.collection('credentials').update(existing.id, recordData)
  } else {
    await su.collection('credentials').create(recordData)
  }
}

export async function disconnectGoogleCalendar(staffId: string): Promise<void> {
  const su = await getSuperuserClient()
  const existing = await su
    .collection('credentials')
    .getFirstListItem(`staff = "${staffId}" && provider = "google_calendar"`)
    .catch(() => null)

  if (existing) {
    if (existing.refresh_token) {
      try {
        const client = newOAuthClient()
        await client.revokeToken(existing.refresh_token as string)
      } catch (err: unknown) {
        console.error('[google-auth] Failed to revoke Google token:', err)
      }
    }
    await su.collection('credentials').delete(existing.id)
  }
}

// Single-flight lock per staff member to prevent token refresh race conditions (Bug 28)
const tokenRefreshLocks = new Map<string, Promise<Credentials>>()

export async function getAuthorizedGoogleClient(staffId: string): Promise<{ auth: OAuth2Client; calendarId: string }> {
  // If another call is currently refreshing the token for this staffId, await it first
  const ongoing = tokenRefreshLocks.get(staffId)
  if (ongoing) {
    await ongoing.catch(() => {})
  }

  const su = await getSuperuserClient()
  const credentials = await su
    .collection('credentials')
    .getFirstListItem(`staff = "${staffId}" && provider = "google_calendar"`)
    .catch(() => null)

  if (!credentials || !credentials.refresh_token) {
    throw new Error('No Google Calendar connection found for this staff member.')
  }

  const client = newOAuthClient()
  const tokenExpiresAt = credentials.token_expires_at ? new Date(credentials.token_expires_at as string).getTime() : 0
  const isExpired = !tokenExpiresAt || tokenExpiresAt <= Date.now() + 60_000

  client.setCredentials({
    access_token: (credentials.access_token as string) || undefined,
    refresh_token: credentials.refresh_token as string,
    expiry_date: tokenExpiresAt || undefined,
  })

  if (isExpired) {
    let refreshPromise = tokenRefreshLocks.get(staffId)
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const { credentials: refreshed } = await client.refreshAccessToken()
          await su.collection('credentials').update(credentials.id, {
            access_token: refreshed.access_token,
            token_expires_at: new Date(refreshed.expiry_date ?? Date.now() + 3600_000).toISOString(),
          }).catch(() => null)
          return refreshed
        } finally {
          tokenRefreshLocks.delete(staffId)
        }
      })()
      tokenRefreshLocks.set(staffId, refreshPromise)
    }

    try {
      const refreshed = await refreshPromise
      if (refreshed) {
        client.setCredentials(refreshed)
      }
    } catch (err: unknown) {
      throw new Error(`Failed to refresh Google access token: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return {
    auth: client,
    calendarId: (credentials.google_calendar_id as string) || 'primary',
  }
}

export interface CalendarEventInput {
  title: string
  startsAt: string
  endsAt: string
  description?: string
}

export async function createGoogleCalendarEvent(
  staffId: string,
  eventInput: CalendarEventInput,
): Promise<string> {
  const { auth, calendarId } = await getAuthorizedGoogleClient(staffId)
  const cal = calendar({ version: 'v3', auth })
  const res = await cal.events.insert({
    calendarId,
    requestBody: {
      summary: eventInput.title,
      description: eventInput.description,
      start: { dateTime: eventInput.startsAt },
      end: { dateTime: eventInput.endsAt },
    },
  })
  if (!res.data.id) throw new Error('Google did not return an event ID.')
  return res.data.id
}

export async function updateGoogleCalendarEvent(
  staffId: string,
  eventId: string,
  eventInput: CalendarEventInput,
): Promise<void> {
  const { auth, calendarId } = await getAuthorizedGoogleClient(staffId)
  const cal = calendar({ version: 'v3', auth })
  await cal.events.patch({
    calendarId,
    eventId,
    requestBody: {
      summary: eventInput.title,
      description: eventInput.description,
      start: { dateTime: eventInput.startsAt },
      end: { dateTime: eventInput.endsAt },
    },
  })
}

export async function deleteGoogleCalendarEvent(
  staffId: string,
  eventId: string,
): Promise<void> {
  const { auth, calendarId } = await getAuthorizedGoogleClient(staffId)
  const cal = calendar({ version: 'v3', auth })
  await cal.events
    .delete({
      calendarId,
      eventId,
    })
    .catch((err: unknown) => {
      const code = typeof err === 'object' && err !== null && 'code' in err ? err.code : undefined
      if (code !== 404 && code !== 410) throw err
    })
}

/**
 * Fetches events from staff's Google Calendar within the given ISO time range.
 * Returns empty array on any failure or if staff has not connected Google Calendar (Bug 24 Graceful Fallback).
 */
export async function getGoogleCalendarEvents(
  staffId: string,
  timeMin: string,
  timeMax: string,
): Promise<calendar_v3.Schema$Event[]> {
  try {
    const { auth, calendarId } = await getAuthorizedGoogleClient(staffId)
    const cal = calendar({ version: 'v3', auth })
    const res = await cal.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      timeZone: STUDIO_TIMEZONE,
    })
    return res.data.items || []
  } catch {
    // Graceful fallback: disconnected calendar or Google API errors do not break availability checks
    return []
  }
}

/**
 * Pure function: converts Google Calendar events for a specific date (YYYY-MM-DD) into TimeInterval[]
 * in minutes from midnight. Filters out transparent events and Inkmind's own synced events.
 */
export function filterGoogleBusyIntervalsForDay(
  events: calendar_v3.Schema$Event[],
  dateStr: string,
  excludeEventIds: Set<string> = new Set(),
): TimeInterval[] {
  const [year = 2026, month = 1, day = 1] = dateStr.split('-').map(Number)
  const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0)
  const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999)

  const intervals: TimeInterval[] = []

  for (const ev of events) {
    if (ev.status === 'cancelled') continue
    if (ev.transparency === 'transparent') continue // Free / non-blocking events
    if (ev.id && excludeEventIds.has(ev.id)) continue // Skip Inkmind's own appointments

    // All-day event (format: "YYYY-MM-DD")
    if (ev.start?.date) {
      const startDate = ev.start.date
      const endDate = ev.end?.date || startDate
      // Google all-day end.date is exclusive
      if (dateStr >= startDate && dateStr < endDate) {
        intervals.push({ start: 0, end: 1440 })
      }
      continue
    }

    // Timed event (dateTime ISO)
    if (ev.start?.dateTime && ev.end?.dateTime) {
      const evStart = new Date(ev.start.dateTime)
      const evEnd = new Date(ev.end.dateTime)

      if (evEnd.getTime() <= dayStart.getTime() || evStart.getTime() >= dayEnd.getTime()) {
        continue // Outside of this day
      }

      const startMins = Math.max(0, Math.floor((evStart.getTime() - dayStart.getTime()) / 60000))
      const endMins = Math.min(1440, Math.ceil((evEnd.getTime() - dayStart.getTime()) / 60000))

      if (endMins > startMins) {
        intervals.push({ start: startMins, end: endMins })
      }
    }
  }

  return intervals
}

/**
 * Convenience helper: fetches Google Calendar events for a single day and returns busy intervals.
 */
export async function getGoogleCalendarBusyIntervals(
  staffId: string,
  dateStr: string,
  excludeEventIds: Set<string> = new Set(),
): Promise<TimeInterval[]> {
  const [year = 2026, month = 1, day = 1] = dateStr.split('-').map(Number)
  const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0)
  const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999)

  const events = await getGoogleCalendarEvents(staffId, dayStart.toISOString(), dayEnd.toISOString())
  return filterGoogleBusyIntervalsForDay(events, dateStr, excludeEventIds)
}