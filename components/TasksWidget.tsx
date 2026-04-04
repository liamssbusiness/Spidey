'use client'

import { useEffect, useState } from 'react'
import { CheckSquare, Square, Plus, Trash2, RefreshCw } from 'lucide-react'

interface Task {
  id: string
  title: string
  completed: boolean
  createdAt: string
}

export default function TasksWidget({ onAsk }: { onAsk?: (prompt: string) => void }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tasks')
      const data = await res.json()
      setTasks(data.tasks ?? [])
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const mutate = async (body: object) => {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setTasks(data.tasks ?? [])
  }

  const addTask = async () => {
    const t = newTitle.trim()
    if (!t) return
    setNewTitle('')
    setAdding(false)
    await mutate({ action: 'add', title: t })
  }

  const pending = tasks.filter(t => !t.completed)
  const completed = tasks.filter(t => t.completed)

  return (
    <div className="glass rounded-xl flex flex-col overflow-hidden h-full">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
        <div className="w-5 h-5 rounded-md bg-green-500/10 flex items-center justify-center">
          <CheckSquare size={11} className="text-green-400" />
        </div>
        <span className="text-xs font-semibold text-text tracking-wide">Tasks</span>
        <span className="ml-1 text-[10px] text-text-dim">{pending.length} open</span>
        <div className="flex-1" />
        <button onClick={load} className="text-text-dim hover:text-text-muted p-1 rounded transition-colors">
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Pending tasks */}
        {pending.length === 0 && !loading && (
          <div className="px-3 py-4 text-center">
            <p className="text-text-dim text-xs">No open tasks</p>
            {onAsk && (
              <button
                onClick={() => onAsk("What tasks should I focus on today based on my emails and calendar?")}
                className="text-green-400 text-xs mt-1 hover:underline"
              >
                Ask Spidey for suggestions
              </button>
            )}
          </div>
        )}

        {pending.map(task => (
          <div key={task.id} className="flex items-center gap-2 px-3 py-2 border-b border-border/40 hover:bg-bg-surface3 group transition-colors">
            <button
              onClick={() => mutate({ action: 'complete', id: task.id })}
              className="shrink-0 text-text-dim hover:text-green-400 transition-colors"
            >
              <Square size={13} />
            </button>
            <span className="flex-1 text-xs text-text leading-relaxed">{task.title}</span>
            <button
              onClick={() => mutate({ action: 'delete', id: task.id })}
              className="shrink-0 opacity-0 group-hover:opacity-100 text-text-dim hover:text-spidey-red transition-all"
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}

        {/* Completed section */}
        {completed.length > 0 && (
          <>
            <button
              onClick={() => setShowCompleted(v => !v)}
              className="w-full px-3 py-2 text-left text-[10px] text-text-dim hover:text-text transition-colors border-b border-border/40"
            >
              {showCompleted ? '▾' : '▸'} Completed ({completed.length})
            </button>
            {showCompleted && completed.map(task => (
              <div key={task.id} className="flex items-center gap-2 px-3 py-2 border-b border-border/40 hover:bg-bg-surface3 group opacity-50 transition-colors">
                <button
                  onClick={() => mutate({ action: 'uncomplete', id: task.id })}
                  className="shrink-0 text-green-500"
                >
                  <CheckSquare size={13} />
                </button>
                <span className="flex-1 text-xs text-text-dim line-through leading-relaxed">{task.title}</span>
                <button
                  onClick={() => mutate({ action: 'delete', id: task.id })}
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-text-dim hover:text-spidey-red transition-all"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Add task */}
      <div className="px-2 pb-2 pt-1.5 shrink-0 border-t border-border/40">
        {adding ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addTask(); if (e.key === 'Escape') setAdding(false) }}
              placeholder="New task..."
              className="flex-1 bg-bg-surface2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-text placeholder:text-text-dim outline-none"
            />
            <button onClick={addTask} className="px-2.5 py-1.5 rounded-lg bg-green-600/20 border border-green-500/40 text-green-400 text-[10px] font-semibold hover:bg-green-600/30 transition-all">
              Add
            </button>
            <button onClick={() => setAdding(false)} className="px-2 py-1.5 text-text-dim text-[10px] hover:text-text">
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-border text-text-dim text-[10px] hover:border-green-500/40 hover:text-green-400 transition-all duration-150"
          >
            <Plus size={10} />
            Add Task
          </button>
        )}
      </div>
    </div>
  )
}
