'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Volume2, Mic, MicOff, CheckCircle, XCircle } from 'lucide-react'
import clsx from 'clsx'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface PlanBlock {
  before: string
  plan: string
  after: string
}

interface ChatPanelProps {
  voiceEnabled: boolean
  externalInput?: string
  onExternalInputConsumed?: () => void
}

function parsePlan(content: string): PlanBlock | null {
  const match = content.match(/^([\s\S]*?)##PLAN##\n([\s\S]+?)\n##END_PLAN##([\s\S]*)$/m)
  if (!match) return null
  return { before: match[1], plan: match[2], after: match[3] }
}

function PlanCard({
  plan,
  onApprove,
  onReject,
  disabled,
}: {
  plan: string
  onApprove: () => void
  onReject: () => void
  disabled: boolean
}) {
  return (
    <div className="rounded-xl border border-gold/40 bg-gold/5 p-4 mt-2 mb-1 space-y-3">
      <div className="text-[10px] font-semibold text-gold uppercase tracking-widest">
        Action Plan
      </div>
      <pre className="text-xs text-text whitespace-pre-wrap font-sans leading-relaxed">{plan}</pre>
      <div className="flex gap-2 pt-1">
        <button
          onClick={onApprove}
          disabled={disabled}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600/20 border border-green-500/40 text-green-400 text-xs font-semibold hover:bg-green-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <CheckCircle size={13} />
          Approve &amp; Execute
        </button>
        <button
          onClick={onReject}
          disabled={disabled}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-bg-surface3 border border-border text-text-dim text-xs font-semibold hover:text-text transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <XCircle size={13} />
          Cancel
        </button>
      </div>
    </div>
  )
}

function MessageContent({
  content,
  onApprove,
  onReject,
  planActioned,
  loading,
}: {
  content: string
  onApprove: (plan: string) => void
  onReject: () => void
  planActioned: boolean
  loading: boolean
}) {
  const parsed = parsePlan(content)
  if (!parsed) return <p className="whitespace-pre-wrap">{content}</p>

  return (
    <>
      {parsed.before && <p className="whitespace-pre-wrap">{parsed.before.trim()}</p>}
      {planActioned ? (
        <div className="text-xs text-text-dim italic mt-2">Plan submitted.</div>
      ) : (
        <PlanCard
          plan={parsed.plan}
          onApprove={() => onApprove(parsed.plan)}
          onReject={onReject}
          disabled={loading}
        />
      )}
      {parsed.after && <p className="whitespace-pre-wrap mt-2">{parsed.after.trim()}</p>}
    </>
  )
}

export default function ChatPanel({
  voiceEnabled,
  externalInput,
  onExternalInputConsumed,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        "Hey! Okay so — I'm Spidey, your AI Chief of Staff. I've got access to your Gmail and Calendar. Ask me anything, tell me what to handle, and I'll get on it. Draft emails, schedule events, summarize your day — just say the word. What do you need?",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [actionedPlans, setActionedPlans] = useState<Set<number>>(new Set())
  const [isListening, setIsListening] = useState(false)
  const [voiceCountdown, setVoiceCountdown] = useState<number | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  // Auto-resize textarea to fit content
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [input])
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingVoiceText = useRef<string>('')

  useEffect(() => {
    if (externalInput) {
      setInput(externalInput)
      inputRef.current?.focus()
      onExternalInputConsumed?.()
    }
  }, [externalInput, onExternalInputConsumed])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      if (countdownRef.current) clearTimeout(countdownRef.current)
    }
  }, [])

  const startListening = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition

    if (!SR) {
      alert('Voice input requires Chrome or Edge.')
      return
    }

    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
      setInput('')
      pendingVoiceText.current = ''
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += text
        } else {
          interim += text
        }
      }

      if (final) {
        pendingVoiceText.current += final + ' '
      }
      setInput((pendingVoiceText.current + interim).trim())

      // Reset auto-send countdown on each result
      if (countdownRef.current) clearTimeout(countdownRef.current)
      setVoiceCountdown(2)
      const tick = (n: number) => {
        countdownRef.current = setTimeout(() => {
          if (n <= 1) {
            setVoiceCountdown(null)
            recognition.stop()
          } else {
            setVoiceCountdown(n - 1)
            tick(n - 1)
          }
        }, 1000)
      }
      tick(2)
    }

    recognition.onend = () => {
      setIsListening(false)
      setVoiceCountdown(null)
      if (countdownRef.current) clearTimeout(countdownRef.current)
      const text = pendingVoiceText.current.trim()
      if (text) {
        setTimeout(() => sendMessage(text), 200)
      }
    }

    recognition.onerror = () => {
      setIsListening(false)
      setVoiceCountdown(null)
    }

    recognition.start()
    recognitionRef.current = recognition
  }

  const stopListening = () => {
    if (countdownRef.current) clearTimeout(countdownRef.current)
    setVoiceCountdown(null)
    recognitionRef.current?.stop()
    setIsListening(false)
  }

  const playVoice = async (text: string) => {
    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.play()
      audio.onended = () => URL.revokeObjectURL(url)
    } catch {
      // Voice unavailable, silent fallback
    }
  }

  const sendMessage = async (overrideContent?: string) => {
    const trimmed = (overrideContent ?? input).trim()
    if (!trimmed || loading) return

    const userMsg: Message = { role: 'user', content: trimmed }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    if (!overrideContent) setInput('')
    else setInput('')
    setLoading(true)
    setStreamingText('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      })

      if (!res.ok || !res.body) throw new Error('Failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        full += chunk
        setStreamingText(full)
      }

      const assistantMsg: Message = { role: 'assistant', content: full }
      setMessages(prev => [...prev, assistantMsg])
      setStreamingText('')

      if (voiceEnabled && full) {
        playVoice(full.slice(0, 400))
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content:
            "Okay so — something went wrong on my end. Try again? My spider-sense is tingling but it might just be the Wi-Fi.",
        },
      ])
      setStreamingText('')
    } finally {
      setLoading(false)
    }
  }

  const handleApprovePlan = (msgIndex: number, plan: string) => {
    setActionedPlans(prev => new Set(prev).add(msgIndex))
    sendMessage(`Approved — go ahead and execute that plan.\n\n${plan}`)
  }

  const handleRejectPlan = (msgIndex: number) => {
    setActionedPlans(prev => new Set(prev).add(msgIndex))
    sendMessage('Actually, cancel that plan.')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="glass rounded-xl flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
        <span className="text-base">⚡</span>
        <span className="text-sm font-semibold text-text">Spidey</span>
        <span className="text-[10px] text-text-dim ml-1">Chief of Staff</span>
        {isListening && (
          <span className="flex items-center gap-1 text-[10px] text-gold ml-2 animate-pulse">
            <Mic size={10} />
            Listening{voiceCountdown !== null ? ` · sending in ${voiceCountdown}s` : '...'}
          </span>
        )}
        {voiceEnabled && !isListening && (
          <span className="flex items-center gap-1 text-[10px] text-gold ml-auto">
            <Volume2 size={10} />
            Voice On
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={clsx('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div
              className={clsx(
                'max-w-[82%] px-4 py-3 rounded-xl text-sm leading-relaxed',
                msg.role === 'assistant' ? 'msg-spidey text-text' : 'msg-user text-text'
              )}
            >
              {msg.role === 'assistant' && (
                <span className="text-[10px] text-gold font-semibold uppercase tracking-widest block mb-1.5">
                  Spidey
                </span>
              )}
              {msg.role === 'assistant' ? (
                <MessageContent
                  content={msg.content}
                  onApprove={(plan) => handleApprovePlan(i, plan)}
                  onReject={() => handleRejectPlan(i)}
                  planActioned={actionedPlans.has(i)}
                  loading={loading}
                />
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {/* Streaming */}
        {streamingText && (
          <div className="flex justify-start">
            <div className="msg-spidey max-w-[82%] px-4 py-3 rounded-xl text-sm leading-relaxed text-text">
              <span className="text-[10px] text-gold font-semibold uppercase tracking-widest block mb-1.5">
                Spidey
              </span>
              <p className="whitespace-pre-wrap typing-cursor">{streamingText}</p>
            </div>
          </div>
        )}

        {/* Loading dots */}
        {loading && !streamingText && (
          <div className="flex justify-start">
            <div className="msg-spidey px-4 py-3 rounded-xl">
              <span className="text-[10px] text-gold font-semibold uppercase tracking-widest block mb-1.5">
                Spidey
              </span>
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-gold opacity-70 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border shrink-0">
        <div className="flex items-end gap-2 bg-bg-surface2 border border-border rounded-xl px-3 py-2">
          {/* Mic button */}
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={loading}
            title={isListening ? 'Stop listening' : 'Speak to Spidey'}
            className={clsx(
              'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200',
              isListening
                ? 'bg-gold text-white animate-pulse'
                : 'bg-bg-surface3 text-text-dim hover:text-gold hover:bg-gold/10 disabled:cursor-not-allowed'
            )}
          >
            {isListening ? <MicOff size={13} /> : <Mic size={13} />}
          </button>

          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? 'Listening...' : 'Ask Spidey anything...'}
            rows={1}
            className="flex-1 bg-transparent text-sm text-text placeholder:text-text-dim resize-none outline-none leading-relaxed overflow-hidden py-0.5"
            style={{ minHeight: '1.5rem' }}
          />

          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className={clsx(
              'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200',
              input.trim() && !loading
                ? 'btn-gold'
                : 'bg-bg-surface3 text-text-dim cursor-not-allowed'
            )}
          >
            <Send size={13} />
          </button>
        </div>
        <p className="text-[10px] text-text-dim mt-1.5 ml-1">
          {isListening ? 'Speaking — pausing will auto-send · click mic to cancel' : 'Enter to send · Shift+Enter for new line · 🎤 to speak'}
        </p>
      </div>
    </div>
  )
}
