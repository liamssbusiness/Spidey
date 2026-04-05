import Anthropic from '@anthropic-ai/sdk'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listEmails, sendEmail } from '@/lib/gmail'
import { listEvents, createEvent } from '@/lib/calendar'
import { readJson, writeJson, readText, writeText } from '@/lib/storage'
import { SPIDEY_SYSTEM_PROMPT } from '@/lib/spidey-prompt'

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY not set')
  return new Anthropic({ apiKey: key })
}

type MessageParam = Anthropic.Messages.MessageParam

interface Task { id: string; title: string; completed: boolean; createdAt: string; completedAt?: string }
interface MemoryItem { id: string; fact: string; createdAt: string }

const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: 'list_emails',
    description: "Fetch Liam's recent inbox emails from Gmail.",
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'list_events',
    description: "Fetch Liam's upcoming Google Calendar events.",
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'send_email',
    description: "Send an email on Liam's behalf. ONLY after plan approval.",
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string' },
        subject: { type: 'string' },
        body: { type: 'string' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'create_calendar_event',
    description: "Create a calendar event. ONLY after plan approval.",
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        startIso: { type: 'string', description: 'ISO 8601 e.g. 2026-04-03T14:00:00' },
        endIso: { type: 'string', description: 'ISO 8601 e.g. 2026-04-03T15:00:00' },
        description: { type: 'string' },
        location: { type: 'string' },
      },
      required: ['title', 'startIso', 'endIso'],
    },
  },
  {
    name: 'list_tasks',
    description: "Read Liam's task list.",
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'add_task',
    description: "Add a task to Liam's task list.",
    input_schema: {
      type: 'object',
      properties: { title: { type: 'string', description: 'Task title' } },
      required: ['title'],
    },
  },
  {
    name: 'complete_task',
    description: "Mark a task as completed by its ID.",
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'read_notes',
    description: "Read Liam's scratchpad notes.",
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'update_notes',
    description: "Replace the notes content. Use sparingly — this overwrites everything.",
    input_schema: {
      type: 'object',
      properties: { content: { type: 'string' } },
      required: ['content'],
    },
  },
  {
    name: 'read_memory',
    description: "Read what Spidey has remembered about Liam.",
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'save_memory',
    description: "Save a fact about Liam to long-term memory. Use when Liam says 'remember that...'",
    input_schema: {
      type: 'object',
      properties: { fact: { type: 'string', description: 'The fact to remember' } },
      required: ['fact'],
    },
  },
  {
    name: 'get_morning_brief',
    description: "Read the stored morning brief.",
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'save_morning_brief',
    description: "Save a morning brief after generating it.",
    input_schema: {
      type: 'object',
      properties: { content: { type: 'string' } },
      required: ['content'],
    },
  },
]

function buildSystemPrompt(): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  const isoStr = now.toISOString()
  return `${SPIDEY_SYSTEM_PROMPT}

## Current Date & Time (CRITICAL — use this for ALL date calculations)
Right now it is: ${dateStr}, ${timeStr}
ISO: ${isoStr}
Year: ${now.getFullYear()}

ALWAYS use ${now.getFullYear()} as the year when the user gives a date without a year. When they say "Sunday", "next week", etc — calculate relative to TODAY (${dateStr}). Never use a past year.`
}

async function runAgentLoop(messages: MessageParam[], accessToken: string): Promise<string> {
  let currentMessages = [...messages]

  for (let i = 0; i < 8; i++) {
    const response = await getClient().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: buildSystemPrompt(),
      tools: TOOLS,
      messages: currentMessages,
    })

    if (response.stop_reason === 'end_turn') {
      const text = response.content.find(b => b.type === 'text') as Anthropic.Messages.TextBlock | undefined
      return text?.text ?? ''
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = []

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue
        const input = block.input as Record<string, string>
        let result: unknown

        try {
          switch (block.name) {
            case 'list_emails':
              result = await listEmails(accessToken)
              break
            case 'list_events':
              result = await listEvents(accessToken)
              break
            case 'send_email': {
              await sendEmail(accessToken, input.to, input.subject, input.body)
              result = { success: true, message: 'Email sent successfully — confirm to user.' }
              break
            }
            case 'create_calendar_event': {
              console.log('[CALENDAR] Creating event:', JSON.stringify(input))
              const eventId = await createEvent(accessToken, input.title, input.startIso, input.endIso, input.description, input.location)
              console.log('[CALENDAR] Created eventId:', eventId)
              result = { success: true, eventId, message: `Calendar event "${input.title}" created with ID ${eventId} — confirm to user with exact time.` }
              break
            }
            case 'list_tasks': {
              const tasks = readJson<Task[]>('tasks.json', [])
              result = tasks
              break
            }
            case 'add_task': {
              const tasks = readJson<Task[]>('tasks.json', [])
              tasks.unshift({ id: Date.now().toString(), title: input.title, completed: false, createdAt: new Date().toISOString() })
              writeJson('tasks.json', tasks)
              result = { success: true, message: `Task added: "${input.title}"` }
              break
            }
            case 'complete_task': {
              const tasks = readJson<Task[]>('tasks.json', [])
              const updated = tasks.map(t => t.id === input.id ? { ...t, completed: true, completedAt: new Date().toISOString() } : t)
              writeJson('tasks.json', updated)
              result = { success: true }
              break
            }
            case 'read_notes':
              result = readText('notes.md') ?? '(empty)'
              break
            case 'update_notes':
              writeText('notes.md', input.content)
              result = { success: true }
              break
            case 'read_memory': {
              const mem = readJson<MemoryItem[]>('memory.json', [])
              result = mem.map(m => m.fact)
              break
            }
            case 'save_memory': {
              const mem = readJson<MemoryItem[]>('memory.json', [])
              mem.unshift({ id: Date.now().toString(), fact: input.fact, createdAt: new Date().toISOString() })
              writeJson('memory.json', mem)
              result = { success: true, message: `Saved: "${input.fact}"` }
              break
            }
            case 'get_morning_brief':
              result = readText('brief.md') ?? '(no brief saved yet)'
              break
            case 'save_morning_brief':
              writeText('brief.md', input.content)
              result = { success: true, message: 'Brief saved.' }
              break
            default:
              result = { error: 'Unknown tool' }
          }
        } catch (err) {
          console.error(`[TOOL ERROR] ${block.name}:`, err)
          const errMsg = String(err)
          const isAuthErr = errMsg.includes('401') || errMsg.includes('403') || errMsg.includes('insufficient') || errMsg.includes('scope')
          result = {
            success: false,
            error: errMsg,
            user_message: isAuthErr
              ? 'AUTH_ERROR: The Google API rejected this request — likely missing OAuth scopes. Tell Liam to sign out and sign back in to grant Gmail/Calendar permissions.'
              : `TOOL_FAILED: ${errMsg}. Tell Liam exactly what failed — never pretend it worked.`,
          }
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        })
      }

      currentMessages = [
        ...currentMessages,
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults },
      ]
    }
  }

  return "Okay so — I hit a loop there. Mind trying that again?"
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    // Allow chat even without Google token — tools that need it will gracefully fail
    const accessToken = session?.accessToken ?? ''

    const { messages } = await req.json()
    const apiMessages: MessageParam[] = messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const result = await runAgentLoop(apiMessages, accessToken)

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(result))
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (err) {
    console.error('Chat error:', err)
    return Response.json({ error: 'Failed to get response' }, { status: 500 })
  }
}
