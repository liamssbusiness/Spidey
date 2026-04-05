'use client'

import { useState, useEffect } from 'react'
import { Mail, CalendarPlus, Sun, Zap, Plus, X, Check, ArrowLeft, Loader2 } from 'lucide-react'

interface CustomAction {
  id: string
  label: string
  prompt: string
}

const DEFAULT_ACTIONS = [
  {
    icon: Sun,
    label: 'Summarize My Day',
    prompt: 'Give me a quick rundown of my day — check my recent emails and upcoming calendar events and brief me like a mission debrief.',
    color: 'text-yellow-400',
    bg: 'hover:bg-yellow-400/10 hover:border-yellow-400/30',
  },
  {
    icon: Mail,
    label: 'Draft an Email',
    prompt: 'Help me draft an email.',
    color: 'text-gold',
    bg: 'hover:bg-gold/10 hover:border-gold/30',
    needsInput: true,
    inputPlaceholder: 'Who to? What about?',
  },
  {
    icon: CalendarPlus,
    label: 'Schedule Event',
    prompt: 'Schedule a calendar event:',
    color: 'text-gold',
    bg: 'hover:bg-gold/10 hover:border-gold/30',
    needsInput: true,
    inputPlaceholder: 'Event name, date, time?',
  },
  {
    icon: Zap,
    label: "What's Urgent?",
    prompt: "Scan my inbox and calendar — what's the most urgent thing I need to handle right now?",
    color: 'text-orange-400',
    bg: 'hover:bg-orange-400/10 hover:border-orange-400/30',
  },
]

const STORAGE_KEY = 'spidey-custom-actions'

interface ActionState {
  loading: boolean
  result: string | null
  label: string
}

export default function QuickActionsWidget({ onAction }: { onAction?: (prompt: string) => void }) {
  const [customActions, setCustomActions] = useState<CustomAction[]>([])
  const [showForm, setShowForm] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newPrompt, setNewPrompt] = useState('')
  const [actionState, setActionState] = useState<ActionState | null>(null)
  const [inputModal, setInputModal] = useState<{ prompt: string; placeholder: string; label: string } | null>(null)
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setCustomActions(JSON.parse(stored))
    } catch {}
  }, [])

  const saveCustom = (actions: CustomAction[]) => {
    setCustomActions(actions)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(actions))
  }

  const addAction = () => {
    if (!newLabel.trim() || !newPrompt.trim()) return
    saveCustom([...customActions, { id: Date.now().toString(), label: newLabel.trim(), prompt: newPrompt.trim() }])
    setNewLabel(''); setNewPrompt(''); setShowForm(false)
  }

  const runAction = async (prompt: string, label: string) => {
    setActionState({ loading: true, result: null, label })
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      })
      const text = await res.text()
      setActionState({ loading: false, result: text, label })
    } catch {
      setActionState({ loading: false, result: 'Something went wrong. Try again.', label })
    }
  }

  const handleActionClick = (action: typeof DEFAULT_ACTIONS[0] | CustomAction) => {
    const needsInput = 'needsInput' in action && action.needsInput
    if (needsInput) {
      setInputModal({
        prompt: action.prompt,
        placeholder: 'inputPlaceholder' in action ? (action.inputPlaceholder ?? '') : '',
        label: action.label,
      })
      setInputValue('')
    } else {
      runAction(action.prompt, action.label)
    }
  }

  const submitInput = () => {
    if (!inputModal || !inputValue.trim()) return
    runAction(`${inputModal.prompt} ${inputValue}`, inputModal.label)
    setInputModal(null)
    setInputValue('')
  }

  // ── Result view ────────────────────────────────────────────────────────────
  if (actionState) {
    return (
      <div className="glass rounded-xl flex flex-col overflow-hidden h-full">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
          <button onClick={() => setActionState(null)} className="text-text-dim hover:text-text transition-colors">
            <ArrowLeft size={13} />
          </button>
          <span className="text-xs font-semibold text-text">{actionState.label}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {actionState.loading ? (
            <div className="flex items-center gap-2 text-text-dim text-xs">
              <Loader2 size={14} className="animate-spin" />
              Spidey is on it…
            </div>
          ) : (
            <div className="text-xs text-text leading-relaxed whitespace-pre-wrap">{actionState.result}</div>
          )}
        </div>
      </div>
    )
  }

  // ── Input modal overlay ────────────────────────────────────────────────────
  if (inputModal) {
    return (
      <div className="glass rounded-xl flex flex-col overflow-hidden h-full">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
          <button onClick={() => setInputModal(null)} className="text-text-dim hover:text-text transition-colors">
            <ArrowLeft size={13} />
          </button>
          <span className="text-xs font-semibold text-text">{inputModal.label}</span>
        </div>
        <div className="flex-1 flex flex-col p-3 gap-3">
          <textarea
            autoFocus
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitInput() } }}
            placeholder={inputModal.placeholder}
            rows={4}
            className="flex-1 bg-bg-surface2 rounded-lg px-3 py-2 text-xs text-text placeholder-text-dim resize-none border border-border focus:border-gold/40 focus:outline-none"
          />
          <button
            onClick={submitInput}
            disabled={!inputValue.trim()}
            className="w-full py-2 rounded-lg bg-gold/15 border border-gold/30 text-gold text-xs font-semibold hover:bg-gold/25 transition-all disabled:opacity-40"
          >
            Run
          </button>
        </div>
      </div>
    )
  }

  // ── Main list ─────────────────────────────────────────────────────────────
  return (
    <div className="glass rounded-xl flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
        <div className="w-5 h-5 rounded-md bg-gold/10 flex items-center justify-center">
          <Zap size={11} className="text-gold" />
        </div>
        <span className="text-xs font-semibold text-text tracking-wide">Quick Actions</span>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-1 p-2">
        {DEFAULT_ACTIONS.map(action => (
          <button
            key={action.label}
            onClick={() => handleActionClick(action)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg border border-transparent text-left transition-all duration-150 ${action.bg}`}
          >
            <action.icon size={12} className={action.color} />
            <span className="text-xs text-text-muted font-medium">{action.label}</span>
          </button>
        ))}

        {customActions.map(action => (
          <div key={action.id} className="flex items-center gap-1 group">
            <button
              onClick={() => handleActionClick(action)}
              className="flex-1 flex items-center gap-3 px-3 py-2 rounded-lg border border-transparent text-left hover:bg-purple-400/10 hover:border-purple-400/30 transition-all duration-150"
            >
              <Zap size={12} className="text-purple-400" />
              <span className="text-xs text-text-muted font-medium">{action.label}</span>
            </button>
            <button
              onClick={() => saveCustom(customActions.filter(a => a.id !== action.id))}
              className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-text-dim hover:text-gold opacity-0 group-hover:opacity-100 transition-all"
            >
              <X size={10} />
            </button>
          </div>
        ))}

        {showForm && (
          <div className="mt-1 p-2.5 rounded-lg bg-bg-surface2 border border-border/60 space-y-2">
            <input
              autoFocus
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="Button label"
              className="w-full bg-transparent text-xs text-text placeholder:text-text-dim border border-border rounded-md px-2.5 py-1.5 outline-none focus:border-gold/50"
            />
            <textarea
              value={newPrompt}
              onChange={e => setNewPrompt(e.target.value)}
              placeholder="What should Spidey do?"
              rows={2}
              className="w-full bg-transparent text-xs text-text placeholder:text-text-dim border border-border rounded-md px-2.5 py-1.5 outline-none resize-none focus:border-gold/50"
            />
            <div className="flex gap-1.5">
              <button
                onClick={addAction}
                disabled={!newLabel.trim() || !newPrompt.trim()}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-gold/20 border border-gold/40 text-gold text-[10px] font-semibold hover:bg-gold/30 transition-all disabled:opacity-40"
              >
                <Check size={10} /> Save
              </button>
              <button
                onClick={() => { setShowForm(false); setNewLabel(''); setNewPrompt('') }}
                className="px-3 py-1.5 rounded-md bg-bg-surface3 border border-border text-text-dim text-[10px] font-semibold hover:text-text transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {!showForm && (
        <div className="px-2 pb-2 shrink-0">
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-border text-text-dim text-[10px] hover:border-gold/40 hover:text-gold transition-all duration-150"
          >
            <Plus size={10} /> Add Custom Action
          </button>
        </div>
      )}
    </div>
  )
}
