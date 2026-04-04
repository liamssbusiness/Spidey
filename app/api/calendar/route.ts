import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listEvents, createEvent } from '@/lib/calendar'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const events = await listEvents(session.accessToken)
    return Response.json({ events })
  } catch (err) {
    console.error('Calendar list error:', err)
    return Response.json({ error: 'Failed to fetch calendar' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { title, startIso, endIso, description, location } = await req.json()
    if (!title || !startIso || !endIso) {
      return Response.json({ error: 'Missing title, startIso, or endIso' }, { status: 400 })
    }
    const eventId = await createEvent(session.accessToken, title, startIso, endIso, description, location)
    return Response.json({ success: true, eventId })
  } catch (err) {
    console.error('Calendar create error:', err)
    return Response.json({ error: 'Failed to create event' }, { status: 500 })
  }
}
