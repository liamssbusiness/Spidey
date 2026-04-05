import { NextRequest, NextResponse } from 'next/server'
import { readJson, writeJson } from '@/lib/storage'

export async function GET() {
  const ideas = readJson<unknown[]>('ideas', [])
  return NextResponse.json(ideas)
}

export async function POST(req: NextRequest) {
  const ideas = await req.json()
  writeJson('ideas', ideas)
  return NextResponse.json({ ok: true })
}
