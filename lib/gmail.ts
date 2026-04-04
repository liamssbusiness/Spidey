import { google } from 'googleapis'

export function getGmailClient(accessToken: string) {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return google.gmail({ version: 'v1', auth })
}

export interface EmailSummary {
  id: string
  from: string
  subject: string
  snippet: string
  date: string
  unread: boolean
}

function parseFrom(raw: string): string {
  // "Name <email>" → "Name" or just email
  const match = raw.match(/^"?([^"<]+)"?\s*</)
  if (match) return match[1].trim()
  return raw.replace(/<.*>/, '').trim() || raw
}

function parseDate(raw: string): string {
  try {
    const d = new Date(raw)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return raw
  }
}

export async function listEmails(accessToken: string, maxResults = 8): Promise<EmailSummary[]> {
  const gmail = getGmailClient(accessToken)

  const list = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    labelIds: ['INBOX'],
  })

  const ids = list.data.messages ?? []
  if (ids.length === 0) return []

  const emails = await Promise.all(
    ids.map(async ({ id }) => {
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: id!,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date'],
      })

      const headers = msg.data.payload?.headers ?? []
      const get = (name: string) => headers.find(h => h.name === name)?.value ?? ''
      const unread = (msg.data.labelIds ?? []).includes('UNREAD')

      return {
        id: id!,
        from: parseFrom(get('From')),
        subject: get('Subject') || '(no subject)',
        snippet: msg.data.snippet ?? '',
        date: parseDate(get('Date')),
        unread,
      }
    })
  )

  return emails
}

export async function sendEmail(
  accessToken: string,
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const gmail = getGmailClient(accessToken)
  const profile = await gmail.users.getProfile({ userId: 'me' })
  const from = profile.data.emailAddress ?? ''

  const raw = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    body,
  ].join('\n')

  const encoded = Buffer.from(raw).toString('base64url')
  await gmail.users.messages.send({ userId: 'me', requestBody: { raw: encoded } })
}
