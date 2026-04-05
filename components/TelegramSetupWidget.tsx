'use client'

import { useState } from 'react'
import { Send, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'

export default function TelegramSetupWidget() {
  const [status, setStatus] = useState<'idle' | 'detecting' | 'connected' | 'error'>('idle')
  const [chatId, setChatId] = useState<string | null>(null)
  const [testMsg, setTestMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')

  const detectChatId = async () => {
    setStatus('detecting')
    setMessage('')
    try {
      const res = await fetch('/api/telegram')
      const data = await res.json()
      if (data.chatId) {
        setChatId(data.chatId)
        setStatus('connected')
        setMessage(`Connected! Chat ID: ${data.chatId}`)
      } else {
        setStatus('error')
        setMessage(data.message || 'No messages found. Send any message to your bot first.')
      }
    } catch {
      setStatus('error')
      setMessage('Could not reach Telegram API.')
    }
  }

  const sendTest = async () => {
    if (!testMsg.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: testMsg }),
      })
      const data = await res.json()
      if (data.ok) {
        setMessage('Message sent! Check Telegram.')
        setTestMsg('')
      } else {
        setMessage(data.error || 'Send failed.')
      }
    } catch {
      setMessage('Send failed.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="glass rounded-xl flex flex-col overflow-hidden h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
        <div className="w-5 h-5 rounded-md bg-blue-500/10 flex items-center justify-center">
          <Send size={11} className="text-blue-400" />
        </div>
        <span className="text-xs font-semibold text-text tracking-wide">Telegram</span>
        {status === 'connected' && (
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">Connected</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Step 1: Connect */}
        <div className="space-y-2">
          <div className="text-[10px] font-semibold text-text-dim uppercase tracking-wider">Step 1 — Connect Bot</div>
          <p className="text-[11px] text-text-dim leading-relaxed">
            Open Telegram and send any message to your bot (search for your bot by the username you gave it).
            Then click Detect below.
          </p>
          <button
            onClick={detectChatId}
            disabled={status === 'detecting'}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold hover:bg-blue-500/20 transition-all disabled:opacity-50 w-full justify-center"
          >
            <RefreshCw size={12} className={status === 'detecting' ? 'animate-spin' : ''} />
            {status === 'detecting' ? 'Detecting…' : 'Detect My Chat ID'}
          </button>
          {status === 'connected' && (
            <div className="flex items-center gap-2 text-[11px] text-green-400">
              <CheckCircle size={12} /> {message}
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-center gap-2 text-[11px] text-red-400">
              <AlertCircle size={12} /> {message}
            </div>
          )}
        </div>

        {/* Step 2: Test */}
        {status === 'connected' && (
          <div className="space-y-2">
            <div className="text-[10px] font-semibold text-text-dim uppercase tracking-wider">Step 2 — Test It</div>
            <div className="flex gap-2">
              <input
                value={testMsg}
                onChange={e => setTestMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendTest()}
                placeholder="Send a test message…"
                className="flex-1 bg-bg-surface2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-text placeholder-text-dim focus:outline-none focus:border-blue-400/40"
              />
              <button
                onClick={sendTest}
                disabled={!testMsg.trim() || sending}
                className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs hover:bg-blue-500/20 transition-all disabled:opacity-40"
              >
                <Send size={12} />
              </button>
            </div>
            {message && status === 'connected' && (
              <p className="text-[10px] text-text-dim">{message}</p>
            )}
          </div>
        )}

        {/* Info */}
        <div className="text-[10px] text-text-dim leading-relaxed space-y-1 border-t border-border pt-3">
          <p>Once connected, Spidey will message you on Telegram with:</p>
          <ul className="list-disc list-inside space-y-0.5 pl-1">
            <li>Morning briefings</li>
            <li>Proactive idea alerts</li>
            <li>Calendar reminders</li>
            <li>Action plan approvals</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
