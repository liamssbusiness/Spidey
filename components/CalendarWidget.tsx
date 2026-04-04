'use client'

import { useEffect, useState } from 'react'
import { Calendar, RefreshCw, Plus } from 'lucide-react'

interface CalEvent {
  id: string
  title: string
  start: string
  end: string
  location?: string
  isToday: boolean
  dayOffset: number
}

function dayLabel(offset: number): string {
  if (offset === 0) return 'Today'
  if (offset === 1) return 'Tomorrow'
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

export default function CalendarWidget({ onAddEvent }: { onAddEvent: () => void }) {
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

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

  const days = [0, 1, 2].map(offset => ({
    offset,
    label: dayLabel(offset),
    events: events.filter(e => e.dayOffset === offset),
  }))

  return (
    <div className="glass rounded-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
        <div className="w-5 h-5 rounded-md bg-spidey-blue/10 flex items-center justify-center">
          <Calendar size={11} className="text-spidey-blue" />
        </div>
        <span className="text-xs font-semibold text-text tracking-wide">Next 3 Days</span>
        <div className="flex-1" />
        <button
          onClick={onAddEvent}
          className="flex items-center gap-1 text-[10px] text-text-muted hover:text-spidey-blue transition-colors px-2 py-1 rounded-md hover:bg-spidey-blue/10"
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
            <button onClick={load} className="text-spidey-blue text-xs mt-1 hover:underline">Retry</button>
          </div>
        )}

        {!loading && !error && (
          <div>
            {days.map(({ offset, label, events: dayEvents }, i) => (
              <div key={offset} className={`px-3 py-2.5 ${i < 2 ? 'border-b border-border/40' : ''}`}>
                {/* Day header */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${offset === 0 ? 'text-spidey-red' : 'text-spidey-blue/80'}`}>
                    {label}
                  </span>
                  {dayEvents.length === 0 && (
                    <span className="text-[10px] text-text-dim">free</span>
                  )}
                </div>

                {dayEvents.length === 0 ? (
                  <div className={`h-0.5 w-8 rounded ${offset === 0 ? 'bg-spidey-red/20' : 'bg-spidey-blue/10'}`} />
                ) : (
                  <div className="space-y-1.5">
                    {dayEvents.map(event => (
                      <div key={event.id} className="flex gap-2.5 items-start hover:bg-bg-surface3 rounded-lg px-2 py-1.5 -mx-2 transition-colors">
                        <div className={`w-0.5 rounded-full shrink-0 self-stretch min-h-[1rem] mt-0.5 ${offset === 0 ? 'bg-spidey-red' : 'bg-spidey-blue'}`} />
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
