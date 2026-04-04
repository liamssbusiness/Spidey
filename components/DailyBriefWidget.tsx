'use client'

import { useState } from 'react'
import { Shield, Zap } from 'lucide-react'

const greetings = [
  (name: string) => `Hey ${name}! Okay so — what's the mission today?`,
  (name: string) => `${name}! Good to see you. A lot going on — let's handle it.`,
  (name: string) => `Alright ${name}, I've been watching your inbox. We should talk.`,
  (name: string) =>
    `${name}! You know me — I've got like six things going on at once. What do you need?`,
  (name: string) => `Hey, hey — ${name}! Ready when you are. Let's get it done.`,
]

const RECOMMENDED_PROMPTS = [
  "Scan my inbox and calendar — give me your top 3 recommended actions I should take right now, as a quick prioritized list.",
  "What's the most urgent thing in my inbox right now? Give me a 2-sentence summary and tell me what I should do about it.",
  "Look at my calendar for the next 48 hours and flag anything I need to prepare for. Keep it brief.",
]

export default function DailyBriefWidget({
  userName,
  onAction,
}: {
  userName: string
  onAction?: (prompt: string) => void
}) {
  const [view, setView] = useState<'status' | 'recommended'>('status')

  const greeting = greetings[new Date().getHours() % greetings.length](userName)
  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="glass rounded-xl flex flex-col overflow-hidden">
      {/* Header with toggle */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
        <div className="w-5 h-5 rounded-md bg-spidey-blue/10 flex items-center justify-center">
          <Shield size={11} className="text-spidey-blue" />
        </div>
        <div className="flex gap-1 ml-auto">
          <button
            onClick={() => setView('status')}
            className={`text-[9px] font-semibold px-2 py-0.5 rounded-md transition-all ${
              view === 'status'
                ? 'bg-spidey-blue/20 text-spidey-blue'
                : 'text-text-dim hover:text-text'
            }`}
          >
            Status
          </button>
          <button
            onClick={() => setView('recommended')}
            className={`text-[9px] font-semibold px-2 py-0.5 rounded-md transition-all ${
              view === 'recommended'
                ? 'bg-spidey-red/20 text-spidey-red'
                : 'text-text-dim hover:text-text'
            }`}
          >
            Actions
          </button>
        </div>
      </div>

      {view === 'status' ? (
        <div className="flex-1 flex flex-col p-3 gap-3">
          {/* Time & Date */}
          <div className="text-center py-2">
            <div className="text-2xl font-bold text-text tracking-tight">{timeStr}</div>
            <div className="text-[10px] text-text-muted mt-0.5">{dateStr}</div>
          </div>

          {/* Greeting */}
          <div className="bg-bg-surface2 rounded-lg px-3 py-2.5 border border-border/50">
            <div className="flex items-start gap-2">
              <span className="text-sm shrink-0 mt-0.5">🕷️</span>
              <p className="text-[11px] text-text leading-relaxed italic">
                &ldquo;{greeting}&rdquo;
              </p>
            </div>
          </div>

          {/* Tip */}
          <div className="mt-auto">
            <p className="text-[9px] text-text-dim uppercase tracking-wider mb-1">Quick access</p>
            <button
              onClick={() => setView('recommended')}
              className="text-[10px] text-spidey-blue hover:underline"
            >
              See recommended actions →
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col p-3 gap-2">
          <p className="text-[9px] text-text-dim uppercase tracking-wider">Ask Spidey</p>
          {RECOMMENDED_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => onAction?.(prompt)}
              className="flex items-start gap-2 text-left px-3 py-2.5 rounded-lg bg-bg-surface2 border border-border/50 hover:border-spidey-red/30 hover:bg-spidey-red/5 transition-all group"
            >
              <Zap
                size={11}
                className="text-spidey-red shrink-0 mt-0.5 opacity-60 group-hover:opacity-100"
              />
              <span className="text-[10px] text-text-muted leading-relaxed group-hover:text-text">
                {prompt}
              </span>
            </button>
          ))}
          <div className="mt-auto">
            <button
              onClick={() => setView('status')}
              className="text-[10px] text-text-dim hover:text-text transition-all"
            >
              ← Back to status
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
