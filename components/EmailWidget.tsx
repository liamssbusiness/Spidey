'use client'

import { useEffect, useState } from 'react'
import { Mail, RefreshCw, PenLine } from 'lucide-react'
import clsx from 'clsx'

interface Email {
  id: string
  from: string
  subject: string
  snippet: string
  date: string
  unread: boolean
}

export default function EmailWidget({ onCompose }: { onCompose: (to: string) => void }) {
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/email')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setEmails(data.emails ?? [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="glass rounded-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
        <div className="w-5 h-5 rounded-md bg-spidey-red/10 flex items-center justify-center">
          <Mail size={11} className="text-spidey-red" />
        </div>
        <span className="text-xs font-semibold text-text tracking-wide">Inbox</span>
        <div className="flex-1" />
        <button
          onClick={() => onCompose('')}
          className="flex items-center gap-1 text-[10px] text-text-muted hover:text-spidey-red transition-colors px-2 py-1 rounded-md hover:bg-spidey-red/10"
        >
          <PenLine size={10} /> Compose
        </button>
        <button
          onClick={load}
          className="text-text-dim hover:text-text-muted transition-colors p-1 rounded"
          title="Refresh"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex flex-col gap-2 p-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-3 bg-bg-surface3 rounded mb-1.5 w-3/4" />
                <div className="h-2.5 bg-bg-surface3 rounded w-full" />
              </div>
            ))}
          </div>
        )}
        {error && (
          <div className="p-4 text-center">
            <p className="text-text-dim text-xs">Couldn't load emails</p>
            <button onClick={load} className="text-spidey-red text-xs mt-1 hover:underline">Retry</button>
          </div>
        )}
        {!loading && !error && emails.length === 0 && (
          <div className="p-4 text-center">
            <p className="text-text-dim text-xs">No recent emails</p>
          </div>
        )}
        {!loading && !error && emails.map(email => (
          <button
            key={email.id}
            onClick={() => onCompose(email.from)}
            className="w-full text-left px-3 py-2.5 border-b border-border/50 hover:bg-bg-surface3 transition-colors group"
          >
            <div className="flex items-start gap-2">
              {email.unread && (
                <div className="w-1.5 h-1.5 rounded-full bg-spidey-red mt-1.5 shrink-0" />
              )}
              <div className={clsx('flex-1 min-w-0', !email.unread && 'pl-3.5')}>
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className={clsx(
                    'text-[11px] truncate',
                    email.unread ? 'text-text font-semibold' : 'text-text-muted'
                  )}>
                    {email.from}
                  </span>
                  <span className="text-[10px] text-text-dim shrink-0">{email.date}</span>
                </div>
                <p className={clsx(
                  'text-[11px] truncate mb-0.5',
                  email.unread ? 'text-text' : 'text-text-muted'
                )}>
                  {email.subject}
                </p>
                <p className="text-[10px] text-text-dim truncate">{email.snippet}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
