'use client'

import { useEffect, useState } from 'react'
import { Calendar, RefreshCw, Plus, ArrowLeft, Loader2 } from 'lucide-react'
import { useInlineAction } from '@/lib/useInlineAction'

interface CalEvent {
  id: string
  title: string
  start: string
  end: string
  location?: string
  isToday: boolean
  dayOffset: number
}

type View = 'list' | 'form' | 'result'

function dayLabel(offset: number): string {
  if (offset === 0) return 'Today'
  if (offset === 1) return 'Tomorrow'
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

export default function CalendarWidget() {
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [view, setView] = useState<View>('list')
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const { loading: actionLoading, result, error: actionError, run, clear } = useInlineAction()

  const load = async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/calendar')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setEvents(data.events ?? [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openForm = () => {
    setEventName('')
    setEventDate('')
    setEventTime('')
    setView('form')
  }

  const handleSubmit = async () => {
    const parts = ['Schedule a calendar event']
    if (eventName.trim()) parts.push(`called "${eventName.trim()}"`)
    if (eventDate.trim()) parts.push(`on ${eventDate.trim()}`)
    if (eventTime.trim()) parts.push(`at ${eventTime.trim()}`)
    const prompt = parts.join(' ')
    setView('result')
    await run(prompt)
  }

  const handleBack = () => {
    setView('list')
    clear()
  }

  const days = [0, 1, 2].map(offset => ({
    offset,
    label: dayLabel(offset),
    events: events.filter(e => e.dayOffset === offset),
  }))

  // ── Result view ──
  if (view === 'result') {
    return (
      <div className="glass rounded-xl flex flex-col overflow-hidden h-full">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
          <button onClick={handleBack} className="text-text-dim hover:text-text transition-colors">
            <ArrowLeft size={13} />
          </button>
          <span className="text-xs font-semibold text-text">Add Event</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {actionLoading ? (
            <div className="flex items-center gap-2 text-text-dim text-xs">
              <Loader2 size={14} className="animate-spin" />
              Spidey is scheduling...
            </div>
          ) : actionError ? (
            <div className="text-xs text-gold">{actionError}</div>
          ) : (
            <div className="text-xs text-text leading-relaxed whitespace-pre-wrap">{result}</div>
          )}
        </div>
      </div>
    )
  }

  // ── Add event form ──
  if (view === 'form') {
    return (
      <div className="glass rounded-xl flex flex-col overflow-hidden h-full">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
          <button onClick={handleBack} className="text-text-dim hover:text-text transition-colors">
            <ArrowLeft size={13} />
          </button>
          <span className="text-xs font-semibold text-text">Add Event</span>
        </div>
        <div className="flex-1 flex flex-col p-3 gap-2">
          <input
            autoFocus
            value={eventName}
            onChange={e => setEventName(e.target.value)}
            placeholder="Event name"
            className="bg-bg-surface2 rounded-lg px-3 py-2 text-xs text-text placeholder-text-dim border border-border focus:border-gold/40 focus:outline-none"
          />
          <input
            value={eventDate}
            onChange={e => setEventDate(e.target.value)}
            placeholder="Date (e.g. tomorrow, April 10)"
            className="bg-bg-surface2 rounded-lg px-3 py-2 text-xs text-text placeholder-text-dim border border-border focus:border-gold/40 focus:outline-none"
          />
          <input
            value={eventTime}
            onChange={e => setEventTime(e.target.value)}
            placeholder="Time (e.g. 3pm, 14:00)"
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
            className="bg-bg-surface2 rounded-lg px-3 py-2 text-xs text-text placeholder-text-dim border border-border focus:border-gold/40 focus:outline-none"
          />
          <button
            onClick={handleSubmit}
            disabled={!eventName.trim()}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gold/15 border border-gold/30 text-gold text-xs font-semibold hover:bg-gold/25 transition-all disabled:opacity-40"
          >
            <Plus size={11} />
            Schedule with Spidey
          </button>
        </div>
      </div>
    )
  }

  // ── List view ──
  return (
    <div className="glass rounded-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
        <div className="w-5 h-5 rounded-md bg-gold/10 flex items-center justify-center">
          <Calendar size={11} className="text-gold" />
        </div>
        <span className="text-xs font-semibold text-text tracking-wide">Next 3 Days</span>
        <div className="flex-1" />
        <button
          onClick={openForm}
          className="flex items-center gap-1 text-[10px] text-text-muted hover:text-gold transition-colors px-2 py-1 rounded-md hover:bg-gold/10"
        >
          <Plus size={10} /> Add
        </button>
        <button onClick={load} className="text-text-dim hover:text-text-muted transition-colors p-1 rounded" title="Refresh">
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex flex-col gap-3 p-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="space-y-1.5">
                <div className="h-2.5 bg-bg-surface3 rounded animate-pulse w-14" />
                <div className="h-7 bg-bg-surface3 rounded animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="p-4 text-center">
            <p className="text-text-dim text-xs">Couldn&apos;t load calendar</p>
            <button onClick={load} className="text-gold text-xs mt-1 hover:underline">Retry</button>
          </div>
        )}

        {!loading && !error && (
          <div>
            {days.map(({ offset, label, events: dayEvents }, i) => (
              <div key={offset} className={`px-3 py-2.5 ${i < 2 ? 'border-b border-border/40' : ''}`}>
                {/* Day header */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${offset === 0 ? 'text-gold' : 'text-gold/80'}`}>
                    {label}
                  </span>
                  {dayEvents.length === 0 && (
                    <span className="text-[10px] text-text-dim">free</span>
                  )}
                </div>

                {dayEvents.length === 0 ? (
                  <div className={`h-0.5 w-8 rounded ${offset === 0 ? 'bg-gold/20' : 'bg-gold/10'}`} />
                ) : (
                  <div className="space-y-1.5">
                    {dayEvents.map(event => (
                      <div key={event.id} className="flex gap-2.5 items-start hover:bg-bg-surface3 rounded-lg px-2 py-1.5 -mx-2 transition-colors">
                        <div className={`w-0.5 rounded-full shrink-0 self-stretch min-h-[1rem] mt-0.5 ${offset === 0 ? 'bg-gold' : 'bg-gold'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-text truncate leading-tight">{event.title}</p>
                          <p className="text-[10px] text-text-muted mt-0.5">
                            {event.start}{event.end && event.end !== event.start ? ` — ${event.end}` : ''}
                          </p>
                          {event.location && (
                            <p className="text-[10px] text-text-dim truncate mt-0.5">{event.location}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
