import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listEmails, sendEmail } from '@/lib/gmail'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const emails = await listEmails(session.accessToken)
    return Response.json({ emails })
  } catch (err) {
    console.error('Email list error:', err)
    return Response.json({ error: 'Failed to fetch emails' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { to, subject, body } = await req.json()
    if (!to || !subject || !body) {
      return Response.json({ error: 'Missing to, subject, or body' }, { status: 400 })
    }
    await sendEmail(session.accessToken, to, subject, body)
    return Response.json({ success: true })
  } catch (err) {
    console.error('Email send error:', err)
    return Response.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
