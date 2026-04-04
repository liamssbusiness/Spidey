import { readJson, writeJson } from '@/lib/storage'

export interface Task {
  id: string
  title: string
  completed: boolean
  createdAt: string
  completedAt?: string
}

function load(): Task[] {
  return readJson<Task[]>('tasks.json', [])
}

export async function GET() {
  return Response.json({ tasks: load() })
}

export async function POST(req: Request) {
  const { action, id, title } = await req.json()
  let tasks = load()

  if (action === 'add') {
    if (!title?.trim()) return Response.json({ error: 'title required' }, { status: 400 })
    tasks.unshift({ id: Date.now().toString(), title: title.trim(), completed: false, createdAt: new Date().toISOString() })
  } else if (action === 'complete') {
    tasks = tasks.map(t => t.id === id ? { ...t, completed: true, completedAt: new Date().toISOString() } : t)
  } else if (action === 'uncomplete') {
    tasks = tasks.map(t => t.id === id ? { ...t, completed: false, completedAt: undefined } : t)
  } else if (action === 'delete') {
    tasks = tasks.filter(t => t.id !== id)
  } else {
    return Response.json({ error: 'unknown action' }, { status: 400 })
  }

  writeJson('tasks.json', tasks)
  return Response.json({ tasks })
}
