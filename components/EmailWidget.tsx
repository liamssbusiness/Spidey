'use client'

import { useEffect, useState } from 'react'
import { Mail, RefreshCw, PenLine, ArrowLeft, Loader2, Send } from 'lucide-react'
import clsx from 'clsx'
import { useInlineAction } from '@/lib/useInlineAction'

interface Email {
  id: string
  from: string
  subject: string
  snippet: string
  date: string
  unread: boolean
}

type View = 'list' | 'compose' | 'result'

export default function EmailWidget() {
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [view, setView] = useState<View>('list')
  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const { loading: actionLoading, result, error: actionError, run, clear } = useInlineAction()

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

  const openCompose = (to: string = '') => {
    setComposeTo(to)
    setComposeSubject('')
    setComposeBody('')
    setView('compose')
  }

  const handleSendCompose = async () => {
    const parts = [`Draft an email`]
    if (composeTo.trim()) parts.push(`to ${composeTo.trim()}`)
    if (composeSubject.trim()) parts.push(`with subject "${composeSubject.trim()}"`)
    if (composeBody.trim()) parts.push(`saying: ${composeBody.trim()}`)
    const prompt = parts.join(' ')
    setView('result')
    await run(prompt)
  }

  const handleBack = () => {
    setView('list')
    clear()
  }

  // ── Result view ──
  if (view === 'result') {
    return (
      <div className="glass rounded-xl flex flex-col overflow-hidden h-full">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
          <button onClick={handleBack} className="text-text-dim hover:text-text transition-colors">
            <ArrowLeft size={13} />
          </button>
          <span className="text-xs font-semibold text-text">Compose Result</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {actionLoading ? (
            <div className="flex items-center gap-2 text-text-dim text-xs">
              <Loader2 size={14} className="animate-spin" />
              Spidey is drafting...
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

  // ── Compose form ──
  if (view === 'compose') {
    return (
      <div className="glass rounded-xl flex flex-col overflow-hidden h-full">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
          <button onClick={handleBack} className="text-text-dim hover:text-text transition-colors">
            <ArrowLeft size={13} />
          </button>
          <span className="text-xs font-semibold text-text">Compose Email</span>
        </div>
        <div className="flex-1 flex flex-col p-3 gap-2">
          <input
            autoFocus
            value={composeTo}
            onChange={e => setComposeTo(e.target.value)}
            placeholder="To (name or email)"
            className="bg-bg-surface2 rounded-lg px-3 py-2 text-xs text-text placeholder-text-dim border border-border focus:border-gold/40 focus:outline-none"
          />
          <input
            value={composeSubject}
            onChange={e => setComposeSubject(e.target.value)}
            placeholder="Subject"
            className="bg-bg-surface2 rounded-lg px-3 py-2 text-xs text-text placeholder-text-dim border border-border focus:border-gold/40 focus:outline-none"
          />
          <textarea
            value={composeBody}
            onChange={e => setComposeBody(e.target.value)}
            placeholder="What should the email say?"
            rows={4}
            className="flex-1 bg-bg-surface2 rounded-lg px-3 py-2 text-xs text-text placeholder-text-dim resize-none border border-border focus:border-gold/40 focus:outline-none"
          />
          <button
            onClick={handleSendCompose}
            disabled={!composeTo.trim() && !composeSubject.trim() && !composeBody.trim()}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gold/15 border border-gold/30 text-gold text-xs font-semibold hover:bg-gold/25 transition-all disabled:opacity-40"
          >
            <Send size={11} />
            Draft with Spidey
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
          <Mail size={11} className="text-gold" />
        </div>
        <span className="text-xs font-semibold text-text tracking-wide">Inbox</span>
        <div className="flex-1" />
        <button
          onClick={() => openCompose('')}
          className="flex items-center gap-1 text-[10px] text-text-muted hover:text-gold transition-colors px-2 py-1 rounded-md hover:bg-gold/10"
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
            <button onClick={load} className="text-gold text-xs mt-1 hover:underline">Retry</button>
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
            onClick={() => openCompose(email.from)}
            className="w-full text-left px-3 py-2.5 border-b border-border/50 hover:bg-bg-surface3 transition-colors group"
          >
            <div className="flex items-start gap-2">
              {email.unread && (
                <div className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5 shrink-0" />
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
