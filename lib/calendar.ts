import { google } from 'googleapis'

export function getCalendarClient(accessToken: string) {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return google.calendar({ version: 'v3', auth })
}

export interface CalEventSummary {
  id: string
  title: string
  start: string
  end: string
  location?: string
  isToday: boolean
  dayOffset: number  // 0=today, 1=tomorrow, 2=day after
}

function formatTime(dateStr: string, dateOnly: boolean): string {
  if (dateOnly) {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export async function listEvents(accessToken: string, maxResults = 20): Promise<CalEventSummary[]> {
  const cal = getCalendarClient(accessToken)

  // Fetch up to 3 days out
  const timeMax = new Date()
  timeMax.setDate(timeMax.getDate() + 3)
  timeMax.setHours(23, 59, 59, 999)

  const res = await cal.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    timeMax: timeMax.toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  })

  const items = res.data.items ?? []
  const now = new Date()

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  return items.map(item => {
    const startRaw = item.start?.dateTime ?? item.start?.date ?? ''
    const endRaw = item.end?.dateTime ?? item.end?.date ?? ''
    const isDateOnly = !item.start?.dateTime
    const startDate = isDateOnly ? new Date(startRaw + 'T00:00:00') : new Date(startRaw)
    const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
    const diffMs = startDay.getTime() - today.getTime()
    const dayOffset = Math.round(diffMs / (1000 * 60 * 60 * 24))
    const isToday = dayOffset === 0

    return {
      id: item.id ?? '',
      title: item.summary ?? 'Untitled',
      start: formatTime(startRaw, isDateOnly),
      end: endRaw ? formatTime(endRaw, isDateOnly) : '',
      location: item.location ?? undefined,
      isToday,
      dayOffset,
    }
  })
}

export async function createEvent(
  accessToken: string,
  title: string,
  startIso: string,
  endIso: string,
  description?: string,
  location?: string
): Promise<string> {
  const cal = getCalendarClient(accessToken)
  const res = await cal.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: title,
      description,
      location,
      start: { dateTime: startIso, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      end: { dateTime: endIso, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    },
  })
  return res.data.id ?? ''
}
