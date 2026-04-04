'use client'

import { useState, useEffect, useRef } from 'react'
import { Timer, Play, Pause, RotateCcw } from 'lucide-react'

const PRESETS = [
  { label: '25 min', seconds: 25 * 60, color: 'text-spidey-red', ring: 'border-spidey-red' },
  { label: '15 min', seconds: 15 * 60, color: 'text-orange-400', ring: 'border-orange-400' },
  { label: '5 min', seconds: 5 * 60, color: 'text-green-400', ring: 'border-green-400' },
]

export default function FocusTimerWidget({ onAsk }: { onAsk?: (prompt: string) => void }) {
  const [preset, setPreset] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(PRESETS[0].seconds)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [sessions, setSessions] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current!)
            setRunning(false)
            setDone(true)
            setSessions(n => n + 1)
            // Browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Spidey: Focus session done!', { body: "Time's up. Great work.", icon: '/favicon.ico' })
            }
            return 0
          }
          return s - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  const selectPreset = (i: number) => {
    setPreset(i)
    setSecondsLeft(PRESETS[i].seconds)
    setRunning(false)
    setDone(false)
  }

  const toggle = () => {
    if (done) return
    if (!running && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    setRunning(r => !r)
    setDone(false)
  }

  const reset = () => {
    setRunning(false)
    setDone(false)
    setSecondsLeft(PRESETS[preset].seconds)
  }

  const mins = Math.floor(secondsLeft / 60).toString().padStart(2, '0')
  const secs = (secondsLeft % 60).toString().padStart(2, '0')
  const total = PRESETS[preset].seconds
  const progress = 1 - secondsLeft / total
  const { color, ring } = PRESETS[preset]

  // SVG ring
  const radius = 44
  const circ = 2 * Math.PI * radius
  const dash = circ * (1 - progress)

  return (
    <div className="glass rounded-xl flex flex-col overflow-hidden h-full">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
        <div className="w-5 h-5 rounded-md bg-orange-500/10 flex items-center justify-center">
          <Timer size={11} className="text-orange-400" />
        </div>
        <span className="text-xs font-semibold text-text tracking-wide">Focus Timer</span>
        {sessions > 0 && (
          <span className="ml-auto text-[10px] text-text-dim">{sessions} session{sessions !== 1 ? 's' : ''} today</span>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4">
        {/* Preset buttons */}
        <div className="flex gap-1.5">
          {PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => selectPreset(i)}
              className={`px-3 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                preset === i
                  ? `${p.color} border-current bg-current/10`
                  : 'text-text-dim border-border hover:text-text'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Ring timer */}
        <div className="relative w-28 h-28">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={radius} fill="none" stroke="#1e1e3a" strokeWidth="6" />
            <circle
              cx="50" cy="50" r={radius} fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeDasharray={circ}
              strokeDashoffset={dash}
              strokeLinecap="round"
              className={`${color} transition-all duration-1000`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold tabular-nums tracking-tight ${done ? 'text-green-400' : 'text-text'}`}>
              {done ? '✓' : `${mins}:${secs}`}
            </span>
            {running && <span className={`text-[9px] ${color} uppercase tracking-widest mt-0.5`}>Focus</span>}
            {done && <span className="text-[9px] text-green-400 uppercase tracking-widest mt-0.5">Done!</span>}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={reset}
            className="w-8 h-8 rounded-full bg-bg-surface2 border border-border flex items-center justify-center text-text-dim hover:text-text transition-colors"
          >
            <RotateCcw size={12} />
          </button>
          <button
            onClick={toggle}
            disabled={done}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              running
                ? 'bg-orange-500/20 border-2 border-orange-500/50 text-orange-400 hover:bg-orange-500/30'
                : 'bg-spidey-red/20 border-2 border-spidey-red/50 text-spidey-red hover:bg-spidey-red/30 disabled:opacity-40'
            }`}
          >
            {running ? <Pause size={18} /> : <Play size={18} />}
          </button>
        </div>

        {done && onAsk && (
          <button
            onClick={() => onAsk("My focus session just finished. What should I work on next?")}
            className="text-[10px] text-spidey-red hover:underline"
          >
            Ask Spidey what&apos;s next
          </button>
        )}
      </div>
    </div>
  )
}
