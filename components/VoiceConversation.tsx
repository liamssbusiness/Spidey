'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Mic, MicOff, Bot, PhoneOff, Send } from 'lucide-react'

type Phase = 'idle' | 'listening' | 'processing' | 'speaking'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface VoiceState {
  phase: Phase
  mounted: boolean
  muted: boolean
  acc: string
  history: Message[]
  recog: any
  audio: HTMLAudioElement | null
  silenceTimer: ReturnType<typeof setTimeout> | null
  audioCtx: AudioContext | null
  analyser: AnalyserNode | null
  micStream: MediaStream | null
}

export default function VoiceConversation({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [liveText, setLiveText] = useState('')
  const [muted, setMuted] = useState(false)
  const [log, setLog] = useState<Message[]>([])
  const [error, setError] = useState<string | null>(null)
  const [manualInput, setManualInput] = useState('')
  const [audioLevel, setAudioLevel] = useState(0)
  const [micWorking, setMicWorking] = useState(false)

  const s = useRef<VoiceState>({
    phase: 'idle', mounted: true, muted: false, acc: '',
    history: [], recog: null, audio: null, silenceTimer: null,
    audioCtx: null, analyser: null, micStream: null,
  }).current

  const logEndRef = useRef<HTMLDivElement>(null)
  const levelAnimRef = useRef<number>(0)

  const sync = (p: Phase) => { s.phase = p; setPhase(p) }

  // ── Audio level monitor — shows if mic is picking up sound ────────────
  const startAudioMonitor = async function() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      s.micStream = stream
      const ctx = new AudioContext()
      s.audioCtx = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      s.analyser = analyser
      setMicWorking(true)

      const data = new Uint8Array(analyser.frequencyBinCount)
      const tick = function() {
        if (!s.mounted) return
        analyser.getByteFrequencyData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) sum += data[i]
        const avg = sum / data.length / 255
        setAudioLevel(avg)
        levelAnimRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch (err) {
      console.error('Mic access error:', err)
      setError('Microphone access denied. Please allow mic access in your browser, or type below.')
      setMicWorking(false)
    }
  }

  const stopAudioMonitor = function() {
    cancelAnimationFrame(levelAnimRef.current)
    s.micStream?.getTracks().forEach(t => t.stop())
    s.audioCtx?.close().catch(() => {})
    s.micStream = null
    s.audioCtx = null
    s.analyser = null
  }

  // ── Speech Recognition ────────────────────────────────────────────────
  const stopRecog = function() {
    if (s.silenceTimer) { clearTimeout(s.silenceTimer); s.silenceTimer = null }
    if (s.recog) { try { s.recog.abort() } catch {} s.recog = null }
  }

  const startRecog = function() {
    stopRecog()
    if (!s.mounted || s.phase !== 'listening') return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) {
      setError('Speech recognition not supported. Use Chrome, or type below.')
      return
    }

    s.acc = ''
    setLiveText('')

    const r = new SR()
    r.continuous = true
    r.interimResults = true
    r.lang = 'en-US'
    r.maxAlternatives = 1
    s.recog = r

    r.onstart = () => {
      console.log('[Voice] Recognition started')
    }

    r.onaudiostart = () => {
      console.log('[Voice] Audio capture started')
    }

    r.onsoundstart = () => {
      console.log('[Voice] Sound detected')
    }

    r.onspeechstart = () => {
      console.log('[Voice] Speech detected')
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
      if (display) {
        setLiveText(display)
        console.log('[Voice] Transcript:', display)
      }

      // Reset silence timer — submit after 2s of quiet
      if (s.silenceTimer) clearTimeout(s.silenceTimer)
      s.silenceTimer = setTimeout(() => {
        const t = s.acc.trim()
        if (t && s.phase === 'listening') sendToSpidey(t)
      }, 2000)
    }

    r.onend = () => {
      console.log('[Voice] Recognition ended, phase:', s.phase)
      // Chrome kills recognition after silence — restart if still listening
      if (s.phase === 'listening' && s.mounted) {
        setTimeout(() => {
          if (s.phase === 'listening' && s.mounted) startRecog()
        }, 300)
      }
    }

    r.onerror = (e: any) => {
      console.log('[Voice] SR error:', e.error)
      if (e.error === 'no-speech') {
        // Normal — just means no speech detected in this interval, will auto-restart via onend
        return
      }
      if (e.error === 'aborted') return
      if (e.error === 'not-allowed') {
        setError('Microphone blocked by browser. Check the address bar for mic permissions.')
        return
      }
      if (e.error === 'network') {
        setError('Speech recognition needs internet. Check your connection, or type below.')
        return
      }
    }

    try {
      r.start()
    } catch (err) {
      console.error('[Voice] SR start failed:', err)
      setError('Could not start speech recognition. Type below instead.')
    }
  }

  // ── Send text to Spidey and play response ────────────────────────────
  const sendToSpidey = async function(text: string) {
    if (!s.mounted || !text.trim()) return
    stopRecog()
    sync('processing')
    setLiveText(text)
    setError(null)

    const userMsg: Message = { role: 'user', content: text }
    s.history = [...s.history, userMsg]
    setLog([...s.history])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: s.history }),
      })
      if (!res.ok) throw new Error(`API ${res.status}`)

      const responseText = await res.text()
      const assistantMsg: Message = { role: 'assistant', content: responseText }
      s.history = [...s.history, assistantMsg]
      if (s.mounted) setLog([...s.history])

      // Speak unless muted
      if (!s.muted && s.mounted) {
        sync('speaking')
        await playAudio(responseText)
      }
    } catch (err) {
      console.error('[Voice] Chat error:', err)
      const errMsg: Message = { role: 'assistant', content: 'Something went wrong. Try again.' }
      s.history = [...s.history, errMsg]
      if (s.mounted) setLog([...s.history])
    }

    // Back to listening
    if (s.mounted) {
      sync('listening')
      setLiveText('')
      setTimeout(() => { if (s.mounted && s.phase === 'listening') startRecog() }, 300)
    }
  }

  // ── TTS via ElevenLabs ───────────────────────────────────────────────
  const playAudio = async function(text: string) {
    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 500) }),
      })
      if (!res.ok) {
        console.error('[Voice] TTS failed:', res.status)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      s.audio = audio
      await new Promise<void>(resolve => {
        audio.onended = () => { URL.revokeObjectURL(url); resolve() }
        audio.onerror = () => { URL.revokeObjectURL(url); resolve() }
        audio.play().catch(() => resolve())
      })
    } catch (err) {
      console.error('[Voice] Audio play error:', err)
    }
  }

  // ── Controls ─────────────────────────────────────────────────────────
  const endCall = function() {
    stopRecog()
    stopAudioMonitor()
    s.audio?.pause()
    onClose()
  }

  const toggleMute = function() {
    s.muted = !s.muted
    setMuted(s.muted)
    if (s.muted && s.audio) {
      s.audio.pause()
      if (s.phase === 'speaking') {
        sync('listening')
        setTimeout(() => startRecog(), 200)
      }
    }
  }

  const handleManualSend = function() {
    const text = manualInput.trim()
    if (!text) return
    setManualInput('')
    sendToSpidey(text)
  }

  // ── Lifecycle ────────────────────────────────────────────────────────
  useEffect(() => {
    s.mounted = true
    sync('listening')
    startAudioMonitor()
    setTimeout(() => startRecog(), 500)
    return () => {
      s.mounted = false
      stopRecog()
      stopAudioMonitor()
      s.audio?.pause()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log])

  // ── Phase visuals ────────────────────────────────────────────────────
  const colors: Record<Phase, { ring: string; shadow: string; icon: string; label: string }> = {
    idle: { ring: 'bg-white/5', shadow: '', icon: 'text-white/30', label: 'Ready' },
    listening: { ring: 'bg-gold/20', shadow: 'shadow-[0_0_60px_rgba(212,175,55,0.4)]', icon: 'text-gold', label: 'Listening...' },
    processing: { ring: 'bg-white/10', shadow: 'shadow-[0_0_60px_rgba(255,255,255,0.2)]', icon: 'text-white/60', label: 'Thinking...' },
    speaking: { ring: 'bg-gold-bright/20', shadow: 'shadow-[0_0_60px_rgba(246,211,101,0.4)]', icon: 'text-gold-bright', label: 'Speaking...' },
  }
  const c = colors[phase]

  // Dynamic orb size based on audio level when listening
  const orbScale = phase === 'listening' ? 1 + audioLevel * 0.5 : 1
  const orbGlow = phase === 'listening' ? `0 0 ${40 + audioLevel * 80}px rgba(212,175,55,${0.2 + audioLevel * 0.4})` : undefined

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-xl">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
          <span className="text-xs font-mono text-white/50 uppercase tracking-wider">
            On Call with Spidey
          </span>
          {/* Mic level indicator */}
          {phase === 'listening' && (
            <div className="flex items-center gap-1 ml-3">
              <div className="flex items-end gap-[2px] h-3">
                {[0.1, 0.25, 0.4, 0.55, 0.7].map((threshold, i) => (
                  <div
                    key={i}
                    className="w-[3px] rounded-full transition-all duration-75"
                    style={{
                      height: `${4 + i * 2}px`,
                      backgroundColor: audioLevel > threshold ? '#d4af37' : '#333',
                    }}
                  />
                ))}
              </div>
              <span className="text-[9px] text-white/20 ml-1">
                {micWorking ? (audioLevel > 0.05 ? 'hearing you' : 'quiet') : 'no mic'}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            title={muted ? 'Unmute Spidey voice' : 'Mute Spidey voice'}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all border ${
              muted ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
            }`}
          >
            {muted ? <MicOff size={14} /> : <Mic size={14} />}
          </button>
          <button
            onClick={endCall}
            className="w-9 h-9 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 hover:bg-red-500/30 transition-all"
            title="End call"
          >
            <PhoneOff size={14} />
          </button>
        </div>
      </div>

      {/* Main content — orb + transcript */}
      <div className="flex-1 flex flex-col items-center overflow-hidden min-h-0">
        {/* Orb */}
        <div className="shrink-0 py-6 flex flex-col items-center">
          <div
            className={`relative flex items-center justify-center w-28 h-28 rounded-full transition-all duration-300 ${c.ring}`}
            style={{
              transform: `scale(${orbScale})`,
              boxShadow: orbGlow || (c.shadow ? undefined : 'none'),
            }}
          >
            {phase === 'listening' && (
              <>
                <div className="absolute inset-[-8px] rounded-full border border-gold/20 animate-pulse" />
                <div className="absolute inset-[-16px] rounded-full border border-gold/10 animate-pulse" style={{ animationDelay: '0.5s' }} />
              </>
            )}
            {phase === 'speaking' && (
              <>
                <div className="absolute inset-[-6px] rounded-full border-2 border-gold-bright/30 animate-pulse" />
                <div className="absolute inset-[-14px] rounded-full border border-gold-bright/15 animate-pulse" style={{ animationDelay: '0.3s' }} />
              </>
            )}
            {phase === 'processing' && (
              <div className="absolute inset-0 rounded-full border-2 border-t-white/40 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            )}
            {phase === 'listening'
              ? <Mic size={32} className={`${c.icon} relative z-10`} />
              : <Bot size={32} className={`${c.icon} relative z-10 ${phase === 'processing' ? 'animate-pulse' : ''}`} />
            }
          </div>
          <div className="mt-3 text-[10px] font-mono text-white/30 uppercase tracking-[0.2em]">
            {c.label}
          </div>

          {/* Live transcript while listening */}
          {liveText && (phase === 'listening' || phase === 'processing') && (
            <div className="mt-3 max-w-md text-center">
              <p className="text-white/40 text-xs italic">&ldquo;{liveText}&rdquo;</p>
            </div>
          )}
          {phase === 'listening' && !liveText && !error && (
            <div className="mt-3">
              <p className="text-white/15 text-[10px]">
                {micWorking && audioLevel > 0.05 ? 'Hearing audio — speak clearly' : 'Speak naturally — Spidey is listening'}
              </p>
            </div>
          )}
          {error && (
            <div className="mt-3 max-w-md text-center">
              <p className="text-red-400/70 text-[10px]">{error}</p>
            </div>
          )}
        </div>

        {/* Conversation transcript */}
        <div className="flex-1 w-full max-w-lg overflow-y-auto min-h-0 px-4 pb-4 space-y-3">
          {log.length === 0 && (
            <div className="text-center py-8">
              <p className="text-white/15 text-xs">Start talking — your conversation will appear here</p>
            </div>
          )}
          {log.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gold/10 text-white/80 border border-gold/15'
                  : 'bg-white/5 text-white/70 border border-white/5'
              }`}>
                {msg.role === 'assistant' && (
                  <div className="text-[9px] text-gold/60 font-semibold mb-1">SPIDEY</div>
                )}
                {msg.content}
              </div>
            </div>
          ))}
          {phase === 'processing' && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-2.5">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={logEndRef} />
        </div>

        {/* Manual text input */}
        <div className="shrink-0 w-full max-w-lg px-4 pb-6">
          <div className="flex gap-2">
            <input
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleManualSend() }}
              placeholder="Type if mic isn't working..."
              disabled={phase === 'processing'}
              className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-gold/30 disabled:opacity-40"
            />
            <button
              onClick={handleManualSend}
              disabled={!manualInput.trim() || phase === 'processing'}
              className="w-9 h-9 rounded-full bg-gold/15 border border-gold/25 flex items-center justify-center text-gold hover:bg-gold/25 transition-all disabled:opacity-30"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
