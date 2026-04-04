'use client'

import { useEffect, useState } from 'react'
import { Sunrise, RefreshCw, ExternalLink } from 'lucide-react'

export default function MorningBriefWidget({ onAsk }: { onAsk?: (prompt: string) => void }) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/brief')
      const data = await res.json()
      setContent(data.exists ? data.content : null)
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const generatePrompt =
    "Generate my morning brief. Check my Gmail inbox for anything important that came in recently, check my calendar for today and tomorrow, then give me a sharp mission-debrief style summary: what's urgent, what's happening today, and what I should prioritise first. Save the brief when you're done."

  return (
    <div className="glass rounded-xl flex flex-col overflow-hidden h-full">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
        <div className="w-5 h-5 rounded-md bg-amber-500/10 flex items-center justify-center">
          <Sunrise size={11} className="text-amber-400" />
        </div>
        <span className="text-xs font-semibold text-text tracking-wide">Morning Brief</span>
        <div className="flex-1" />
        {content && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-[10px] text-text-dim hover:text-text transition-colors mr-1"
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        )}
        <button onClick={load} className="text-text-dim hover:text-text-muted p-1 rounded transition-colors">
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-3 bg-bg-surface3 rounded animate-pulse" style={{ width: `${70 + i * 5}%` }} />
            ))}
          </div>
        )}

        {!loading && !content && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-4">
            <div className="text-3xl">🌅</div>
            <div>
              <p className="text-text-muted text-xs font-medium">No brief yet</p>
              <p className="text-text-dim text-[10px] mt-1 leading-relaxed max-w-[200px]">
                Your CoWork task will drop one here automatically, or generate one now.
              </p>
            </div>
            {onAsk && (
              <button
                onClick={() => onAsk(generatePrompt)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-all"
              >
                <Sunrise size={12} />
                Generate Now
              </button>
            )}
          </div>
        )}

        {!loading && content && (
          <div className={`${expanded ? '' : 'max-h-64 overflow-hidden relative'}`}>
            <pre className="text-xs text-text whitespace-pre-wrap font-sans leading-relaxed">{content}</pre>
            {!expanded && (
              <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-bg-card to-transparent pointer-events-none" />
            )}
          </div>
        )}
      </div>

      {!loading && content && (
        <div className="px-3 py-2 border-t border-border/40 shrink-0 flex items-center justify-between">
          {onAsk && (
            <button
              onClick={() => onAsk(generatePrompt)}
              className="flex items-center gap-1 text-[10px] text-amber-400 hover:underline"
            >
              <RefreshCw size={9} /> Regenerate
            </button>
          )}
          <span className="text-[10px] text-text-dim ml-auto">
            CoWork auto-saves here daily
          </span>
        </div>
      )}
    </div>
  )
}
