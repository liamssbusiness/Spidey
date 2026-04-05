import { NextRequest, NextResponse } from 'next/server'
import { readJson, writeJson } from '@/lib/storage'

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TG = TOKEN ? `https://api.telegram.org/bot${TOKEN}` : null

// Send a message to the user on Telegram
export async function POST(req: NextRequest) {
  if (!TG) return NextResponse.json({ error: 'Telegram not configured' }, { status: 503 })

  const { text, chatId } = await req.json()

  // Try stored chat ID if not provided
  let targetId = chatId
  if (!targetId) {
    const cfg = readJson<{ chatId?: string }>('telegram-config', {})
    targetId = cfg?.chatId || process.env.TELEGRAM_CHAT_ID
  }

  if (!targetId) {
    return NextResponse.json({ error: 'No chat ID — message your Telegram bot first' }, { status: 400 })
  }

  const res = await fetch(`${TG}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: targetId, text, parse_mode: 'Markdown' }),
  })
  const data = await res.json()
  return NextResponse.json(data)
}

// GET: auto-detect your chat ID from recent bot messages
export async function GET() {
  if (!TG) return NextResponse.json({ error: 'Telegram not configured' }, { status: 503 })

  const res = await fetch(`${TG}/getUpdates?limit=5`)
  const data = await res.json()

  if (data.ok && data.result?.length > 0) {
    const latest = data.result[data.result.length - 1]
    const chatId = latest.message?.chat?.id?.toString()
    if (chatId) {
      writeJson('telegram-config', { chatId })
      return NextResponse.json({ chatId, message: 'Chat ID detected and saved!' })
    }
  }

  return NextResponse.json({ chatId: null, message: 'No messages found — send any message to your bot first' })
}
