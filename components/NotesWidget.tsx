'use client'

import { useEffect, useState, useRef } from 'react'
import { FileText, Save, RefreshCw } from 'lucide-react'

export default function NotesWidget() {
  const [content, setContent] = useState('')
  const [saved, setSaved] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notes')
      const data = await res.json()
      setContent(data.content ?? '')
      setSaved(true)
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async (text: string) => {
    setSaving(true)
    try {
      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })
      setSaved(true)
    } catch { /* ignore */ }
    setSaving(false)
  }

  const handleChange = (text: string) => {
    setContent(text)
    setSaved(false)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => save(text), 1200)
  }

  return (
    <div className="glass rounded-xl flex flex-col overflow-hidden h-full">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
        <div className="w-5 h-5 rounded-md bg-yellow-500/10 flex items-center justify-center">
          <FileText size={11} className="text-yellow-400" />
        </div>
        <span className="text-xs font-semibold text-text tracking-wide">Notes</span>
        <div className="flex-1" />
        {saving ? (
          <RefreshCw size={10} className="text-text-dim animate-spin" />
        ) : saved ? (
          <span className="text-[10px] text-text-dim">Saved</span>
        ) : (
          <button onClick={() => save(content)} className="flex items-center gap-1 text-[10px] text-yellow-400 hover:underline">
            <Save size={10} /> Save
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 p-2">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <RefreshCw size={14} className="text-text-dim animate-spin" />
          </div>
        ) : (
          <textarea
            value={content}
            onChange={e => handleChange(e.target.value)}
            placeholder={"Jot anything down here — Spidey can read these.\n\nIdeas, context, client notes, whatever..."}
            className="w-full h-full bg-transparent text-xs text-text placeholder:text-text-dim resize-none outline-none leading-relaxed"
            style={{ scrollbarWidth: 'thin' }}
          />
        )}
      </div>
    </div>
  )
}
