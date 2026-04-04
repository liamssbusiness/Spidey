import { readText, writeText } from '@/lib/storage'

export async function GET() {
  const content = readText('notes.md') ?? ''
  return Response.json({ content })
}

export async function POST(req: Request) {
  const { content } = await req.json()
  if (typeof content !== 'string') return Response.json({ error: 'content required' }, { status: 400 })
  writeText('notes.md', content)
  return Response.json({ ok: true })
}
