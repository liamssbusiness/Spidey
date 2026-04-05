'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, X } from 'lucide-react'

type Phase = 'listening' | 'processing' | 'speaking'

interface Message { role: 'user' | 'assistant'; content: string }

interface OrbState {
  phase: Phase
  mounted: boolean
  muted: boolean
  acc: string
  history: Message[]
  recog: any
  audio: HTMLAudioElement | null
  silenceTimer: ReturnType<typeof setTimeout> | null
  speaking: boolean
}

export default function VoiceOrb({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('listening')
  const [liveText, setLiveText] = useState('')
  const [muted, setMuted] = useState(false)
  const [lastResponse, setLastResponse] = useState('')
  const [isSpeaking, setIsSpeaking] = useState(false) // user is actively speaking

  const s = useRef<OrbState>({
    phase: 'listening', mounted: true, muted: false, acc: '',
    history: [], recog: null, audio: null, silenceTimer: null,
    speaking: false,
  }).current

  const sync = (p: Phase) => { s.phase = p; setPhase(p) }

  // ── Speech Recognition only (no AudioContext to avoid mic conflicts) ──
  const stopSR = () => {
    if (s.silenceTimer) { clearTimeout(s.silenceTimer); s.silenceTimer = null }
    if (s.recog) { try { s.recog.abort() } catch {} s.recog = null }
  }

  const startSR = () => {
    stopSR()
    if (!s.mounted || s.phase !== 'listening') return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) return

    s.acc = ''
    setLiveText('')
    setIsSpeaking(false)

    const r = new SR()
    r.continuous = true
    r.interimResults = true
    r.lang = 'en-US'
    s.recog = r

    r.onspeechstart = () => {
      s.speaking = true
      setIsSpeaking(true)
    }

    r.onspeechend = () => {
      s.speaking = false
      setIsSpeaking(false)
    }

    r.onresult = (e: any) => {
      if (s.phase !== 'listening') return
      let finalText = ''
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += t
        else interim += t
      }
      if (finalText) s.acc += finalText + ' '
      const display = (s.acc + interim).trim()
      if (display) setLiveText(display)

      if (s.silenceTimer) clearTimeout(s.silenceTimer)
      s.silenceTimer = setTimeout(() => {
        const t = s.acc.trim()
        if (t && s.phase === 'listening') send(t)
      }, 2000)
    }

    r.onend = () => {
      s.speaking = false
      setIsSpeaking(false)
      if (s.phase === 'listening' && s.mounted) {
        setTimeout(() => { if (s.phase === 'listening' && s.mounted) startSR() }, 300)
      }
    }

    r.onerror = (e: any) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return
      console.log('[Orb] SR error:', e.error)
    }

    try { r.start() } catch {}
  }

  // ── Send to Spidey ───────────────────────────────────────────────────
  const send = async (text: string) => {
    if (!s.mounted || !text.trim()) return
    stopSR()
    sync('processing')
    setLiveText(text)

    const userMsg: Message = { role: 'user', content: text }
    s.history = [...s.history, userMsg]

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: s.history }),
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const responseText = await res.text()
      s.history = [...s.history, { role: 'assistant', content: responseText }]
      setLastResponse(responseText.slice(0, 200))

      if (!s.muted && s.mounted) {
        sync('speaking')
        await playTTS(responseText)
      }
    } catch (err) {
      console.error('[Orb] Error:', err)
      setLastResponse('Something went wrong.')
    }

    if (s.mounted) {
      sync('listening')
      setLiveText('')
      setTimeout(() => { if (s.mounted && s.phase === 'listening') startSR() }, 300)
    }
  }

  // ── TTS ──────────────────────────────────────────────────────────────
  const playTTS = async (text: string) => {
    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 500) }),
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      s.audio = audio
      await new Promise<void>(resolve => {
        audio.onended = () => { URL.revokeObjectURL(url); resolve() }
        audio.onerror = () => { URL.revokeObjectURL(url); resolve() }
        audio.play().catch(() => resolve())
      })
    } catch {}
  }

  // ── Lifecycle ────────────────────────────────────────────────────────
  useEffect(() => {
    s.mounted = true
    sync('listening')
    // Small delay to ensure component is fully mounted
    setTimeout(() => startSR(), 300)
    return () => {
      s.mounted = false
      stopSR()
      s.audio?.pause()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Visual ───────────────────────────────────────────────────────────
  const baseSize = 56
  const pulseExtra = phase === 'listening' && isSpeaking ? 12 : phase === 'speaking' ? 8 : 0
  const orbSize = baseSize + pulseExtra

  const bgColor = phase === 'listening'
    ? (isSpeaking ? 'rgba(212,175,55,0.35)' : 'rgba(212,175,55,0.15)')
    : phase === 'processing'
      ? 'rgba(255,255,255,0.1)'
      : 'rgba(246,211,101,0.25)'

  const glowColor = phase === 'listening'
    ? (isSpeaking ? '0 0 30px rgba(212,175,55,0.5)' : '0 0 12px rgba(212,175,55,0.2)')
    : phase === 'speaking'
      ? '0 0 25px rgba(246,211,101,0.4)'
      : '0 0 8px rgba(255,255,255,0.1)'

  const iconColor = phase === 'listening' ? '#d4af37' : phase === 'speaking' ? '#f6d365' : '#888'

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Tooltip */}
      {(liveText || lastResponse || phase === 'processing') && (
        <div
          className="max-w-72 rounded-xl px-3 py-2 text-[11px] leading-relaxed border backdrop-blur-md"
          style={{
            background: 'rgba(10,10,10,0.92)',
            borderColor: 'rgba(212,175,55,0.15)',
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          {phase === 'processing' && (
            <div className="flex gap-1 py-0.5">
              <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
          {phase === 'listening' && liveText && (
            <p className="text-white/50 italic">&ldquo;{liveText}&rdquo;</p>
          )}
          {(phase === 'speaking' || (phase === 'listening' && !liveText && lastResponse)) && (
            <p>{lastResponse}{lastResponse.length >= 200 ? '…' : ''}</p>
          )}
        </div>
      )}

      {/* Controls row */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            s.muted = !s.muted
            setMuted(s.muted)
            if (s.muted && s.audio) {
              s.audio.pause()
              if (s.phase === 'speaking') { sync('listening'); setTimeout(() => startSR(), 200) }
            }
          }}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border ${
            muted ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-white/5 border-white/10 text-white/30 hover:text-white'
          }`}
          title={muted ? 'Unmute' : 'Mute voice'}
        >
          {muted ? <MicOff size={12} /> : <Mic size={12} />}
        </button>

        <div
          className="relative rounded-full flex items-center justify-center transition-all duration-150 cursor-default"
          style={{ width: orbSize, height: orbSize, background: bgColor, boxShadow: glowColor }}
        >
          {phase === 'processing' && (
            <div className="absolute inset-0 rounded-full border-2 border-t-white/40 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          )}
          {phase === 'speaking' && (
            <div className="absolute inset-[-4px] rounded-full border border-gold-bright/30 animate-pulse" />
          )}
          <Mic size={20} style={{ color: iconColor }} />
        </div>

        <button
          onClick={() => { stopSR(); s.audio?.pause(); onClose() }}
          className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all"
          title="Stop voice"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
}
