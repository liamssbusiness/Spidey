'use client'

import { useState, useEffect } from 'react'
import { Mail, CalendarPlus, Sun, Zap, Plus, X, Check } from 'lucide-react'

interface CustomAction {
  id: string
  label: string
  prompt: string
}

const DEFAULT_ACTIONS = [
  {
    icon: Sun,
    label: 'Summarize My Day',
    prompt:
      'Give me a quick rundown of my day — check my recent emails and upcoming calendar events and brief me like a mission debrief.',
    color: 'text-yellow-400',
    bg: 'hover:bg-yellow-400/10 hover:border-yellow-400/30',
  },
  {
    icon: Mail,
    label: 'Draft an Email',
    prompt: 'Help me draft an email. Who should I send it to and what should it say?',
    color: 'text-spidey-red',
    bg: 'hover:bg-spidey-red/10 hover:border-spidey-red/30',
  },
  {
    icon: CalendarPlus,
    label: 'Schedule Event',
    prompt: 'I need to schedule an event. What event should I add to my calendar?',
    color: 'text-spidey-blue',
    bg: 'hover:bg-spidey-blue/10 hover:border-spidey-blue/30',
  },
  {
    icon: Zap,
    label: "What's Urgent?",
    prompt:
      "Scan my inbox and calendar — what's the most urgent thing I need to handle right now?",
    color: 'text-orange-400',
    bg: 'hover:bg-orange-400/10 hover:border-orange-400/30',
  },
]

const STORAGE_KEY = 'spidey-custom-actions'

export default function QuickActionsWidget({ onAction }: { onAction: (prompt: string) => void }) {
  const [customActions, setCustomActions] = useState<CustomAction[]>([])
  const [showForm, setShowForm] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newPrompt, setNewPrompt] = useState('')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setCustomActions(JSON.parse(stored))
    } catch {
      // ignore
    }
  }, [])

  const saveCustom = (actions: CustomAction[]) => {
    setCustomActions(actions)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(actions))
  }

  const addAction = () => {
    if (!newLabel.trim() || !newPrompt.trim()) return
    const next: CustomAction[] = [
      ...customActions,
      { id: Date.now().toString(), label: newLabel.trim(), prompt: newPrompt.trim() },
    ]
    saveCustom(next)
    setNewLabel('')
    setNewPrompt('')
    setShowForm(false)
  }

  const removeAction = (id: string) => {
    saveCustom(customActions.filter(a => a.id !== id))
  }

  return (
    <div className="glass rounded-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
        <div className="w-5 h-5 rounded-md bg-spidey-red/10 flex items-center justify-center">
          <Zap size={11} className="text-spidey-red" />
        </div>
        <span className="text-xs font-semibold text-text tracking-wide">Quick Actions</span>
      </div>

      {/* Actions */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-1 p-2">
        {/* Default */}
        {DEFAULT_ACTIONS.map(({ icon: Icon, label, prompt, color, bg }) => (
          <button
            key={label}
            onClick={() => onAction(prompt)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg border border-transparent text-left transition-all duration-150 ${bg}`}
          >
            <Icon size={12} className={color} />
            <span className="text-xs text-text-muted font-medium">{label}</span>
          </button>
        ))}

        {/* Custom actions */}
        {customActions.map(action => (
          <div key={action.id} className="flex items-center gap-1 group">
            <button
              onClick={() => onAction(action.prompt)}
              className="flex-1 flex items-center gap-3 px-3 py-2 rounded-lg border border-transparent text-left hover:bg-purple-400/10 hover:border-purple-400/30 transition-all duration-150"
            >
              <Zap size={12} className="text-purple-400" />
              <span className="text-xs text-text-muted font-medium">{action.label}</span>
            </button>
            <button
              onClick={() => removeAction(action.id)}
              className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-text-dim hover:text-spidey-red opacity-0 group-hover:opacity-100 transition-all"
            >
              <X size={10} />
            </button>
          </div>
        ))}

        {/* Add form */}
        {showForm && (
          <div className="mt-1 p-2.5 rounded-lg bg-bg-surface2 border border-border/60 space-y-2">
            <input
              autoFocus
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="Button label"
              className="w-full bg-transparent text-xs text-text placeholder:text-text-dim border border-border rounded-md px-2.5 py-1.5 outline-none focus:border-spidey-red/50"
            />
            <textarea
              value={newPrompt}
              onChange={e => setNewPrompt(e.target.value)}
              placeholder="What should Spidey do?"
              rows={2}
              className="w-full bg-transparent text-xs text-text placeholder:text-text-dim border border-border rounded-md px-2.5 py-1.5 outline-none resize-none focus:border-spidey-red/50"
            />
            <div className="flex gap-1.5">
              <button
                onClick={addAction}
                disabled={!newLabel.trim() || !newPrompt.trim()}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-spidey-red/20 border border-spidey-red/40 text-spidey-red text-[10px] font-semibold hover:bg-spidey-red/30 transition-all disabled:opacity-40"
              >
                <Check size={10} />
                Save
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

      {/* Add button */}
      {!showForm && (
        <div className="px-2 pb-2 shrink-0">
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-border text-text-dim text-[10px] hover:border-spidey-red/40 hover:text-spidey-red transition-all duration-150"
          >
            <Plus size={10} />
            Add Custom Action
          </button>
        </div>
      )}
    </div>
  )
}
