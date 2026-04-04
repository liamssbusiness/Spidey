import { readJson, writeJson } from '@/lib/storage'

export interface MemoryItem {
  id: string
  fact: string
  createdAt: string
}

function load(): MemoryItem[] {
  return readJson<MemoryItem[]>('memory.json', [])
}

export async function GET() {
  return Response.json({ memory: load() })
}

export async function POST(req: Request) {
  const { action, id, fact } = await req.json()
  let memory = load()

  if (action === 'add') {
    if (!fact?.trim()) return Response.json({ error: 'fact required' }, { status: 400 })
    memory.unshift({ id: Date.now().toString(), fact: fact.trim(), createdAt: new Date().toISOString() })
  } else if (action === 'delete') {
    memory = memory.filter(m => m.id !== id)
  } else {
    return Response.json({ error: 'unknown action' }, { status: 400 })
  }

  writeJson('memory.json', memory)
  return Response.json({ memory })
}
