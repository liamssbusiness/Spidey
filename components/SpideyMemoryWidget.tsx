'use client'

import { useEffect, useState } from 'react'
import { Brain, Trash2, RefreshCw } from 'lucide-react'

interface MemoryItem {
  id: string
  fact: string
  createdAt: string
}

export default function SpideyMemoryWidget() {
  const [memory, setMemory] = useState<MemoryItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/memory')
      const data = await res.json()
      setMemory(data.memory ?? [])
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const remove = async (id: string) => {
    const res = await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    })
    const data = await res.json()
    setMemory(data.memory ?? [])
  }

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch { return '' }
  }

  return (
    <div className="glass rounded-xl flex flex-col overflow-hidden h-full">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
        <div className="w-5 h-5 rounded-md bg-purple-500/10 flex items-center justify-center">
          <Brain size={11} className="text-purple-400" />
        </div>
        <span className="text-xs font-semibold text-text tracking-wide">Spidey&apos;s Memory</span>
        <span className="ml-1 text-[10px] text-text-dim">{memory.length} items</span>
        <div className="flex-1" />
        <button onClick={load} className="text-text-dim hover:text-text-muted p-1 rounded transition-colors">
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="p-3 space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-3 bg-bg-surface3 rounded animate-pulse w-full" />
            ))}
          </div>
        )}

        {!loading && memory.length === 0 && (
          <div className="p-4 text-center">
            <p className="text-text-dim text-xs">Nothing stored yet</p>
            <p className="text-text-dim text-[10px] mt-1 leading-relaxed">
              Tell Spidey something like &ldquo;Remember that I prefer emails under 3 paragraphs&rdquo;
            </p>
          </div>
        )}

        {!loading && memory.map(item => (
          <div key={item.id} className="flex items-start gap-2 px-3 py-2.5 border-b border-border/40 hover:bg-bg-surface3 group transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text leading-relaxed">{item.fact}</p>
              <p className="text-[10px] text-text-dim mt-0.5">{formatDate(item.createdAt)}</p>
            </div>
            <button
              onClick={() => remove(item.id)}
              className="shrink-0 opacity-0 group-hover:opacity-100 text-text-dim hover:text-spidey-red transition-all mt-0.5"
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}
      </div>

      <div className="px-3 py-2 border-t border-border/40 shrink-0">
        <p className="text-[10px] text-text-dim leading-relaxed">
          Say &ldquo;Remember that...&rdquo; in chat and Spidey will save it here.
        </p>
      </div>
    </div>
  )
}
