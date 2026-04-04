import { readText, writeText } from '@/lib/storage'

export async function GET() {
  const content = readText('brief.md')
  return Response.json({ content, exists: content !== null })
}

export async function POST(req: Request) {
  const { content } = await req.json()
  if (typeof content !== 'string') return Response.json({ error: 'content required' }, { status: 400 })
  writeText('brief.md', content)
  return Response.json({ ok: true })
}
