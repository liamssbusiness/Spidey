'use client'

import { useState, useEffect, useRef } from 'react'
import { Lightbulb, Send, CheckCircle, XCircle, ChevronDown, ChevronUp, Trash2, Zap, Clock, Star } from 'lucide-react'

type IdeaStatus = 'drafting' | 'refining' | 'planning' | 'approved' | 'active' | 'done'

interface ActionStep {
  step: string
  done: boolean
}

interface Idea {
  id: string
  title: string
  rawDump: string
  refined: string
  spideyTake: string
  actionSteps: ActionStep[]
  status: IdeaStatus
  createdAt: string
  updatedAt: string
  tags: string[]
}

interface ConvMessage {
  role: 'user' | 'assistant'
  content: string
}

const STATUS_COLORS: Record<IdeaStatus, string> = {
  drafting: 'text-white/40 bg-white/5 border-white/10',
  refining: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  planning: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  approved: 'text-green-400 bg-green-400/10 border-green-400/20',
  active: 'text-gold bg-gold/10 border-gold/20',
  done: 'text-white/30 bg-white/5 border-white/10',
}

const STATUS_LABELS: Record<IdeaStatus, string> = {
  drafting: 'Draft',
  refining: 'Refining',
  planning: 'Planning',
  approved: 'Approved',
  active: 'Active',
  done: 'Done',
}

export default function IdeaVaultWidget() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [view, setView] = useState<'vault' | 'new' | 'detail'>('vault')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dumpText, setDumpText] = useState('')
  const [conv, setConv] = useState<ConvMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentIdea, setCurrentIdea] = useState<Partial<Idea> | null>(null)
  const convEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load ideas from API
  useEffect(() => {
    fetch('/api/vault').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setIdeas(d)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    convEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conv])

  const saveIdeas = async (updated: Idea[]) => {
    setIdeas(updated)
    await fetch('/api/vault', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {})
  }

  const startNewIdea = async () => {
    if (!dumpText.trim()) return
    setView('new')
    const userMsg: ConvMessage = { role: 'user', content: dumpText }
    setConv([userMsg])
    setLoading(true)

    const systemMsg = `You are Spidey, Liam's personal AI assistant and strategic partner. Liam has just brain-dumped an idea. Your job:
1. Ask 2-3 sharp questions to fully understand and refine the idea
2. Challenge weak parts — you are allowed to disagree and push back
3. Add your own strategic perspective and improvements
4. Once the idea is fully formed, output a structured summary in this exact format:
##IDEA##
Title: [short catchy title]
Refined Idea: [2-3 sentences of the polished idea]
Spidey's Take: [your honest assessment and additions — be direct]
Action Steps:
- [step 1]
- [step 2]
- [step 3]
##END_IDEA##

Start by engaging with the idea and asking your first clarifying questions. Be direct, confident, and genuinely helpful.`

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `[IDEA VAULT SESSION]\n${dumpText}` }],
          systemOverride: systemMsg,
        }),
      })
      const text = await res.text()
      const assistantMsg: ConvMessage = { role: 'assistant', content: text }
      setConv([userMsg, assistantMsg])
      parseIdeaFromResponse(text, dumpText)
    } catch {
      setConv(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg: ConvMessage = { role: 'user', content: input }
    const newConv = [...conv, userMsg]
    setConv(newConv)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newConv }),
      })
      const text = await res.text()
      const assistantMsg: ConvMessage = { role: 'assistant', content: text }
      setConv([...newConv, assistantMsg])
      parseIdeaFromResponse(text, dumpText)
    } catch {
      setConv(prev => [...prev, { role: 'assistant', content: 'Error — try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const parseIdeaFromResponse = (text: string, rawDump: string) => {
    const match = text.match(/##IDEA##\n([\s\S]+?)\n##END_IDEA##/)
    if (!match) return

    const body = match[1]
    const titleMatch = body.match(/Title:\s*(.+)/)
    const refinedMatch = body.match(/Refined Idea:\s*([\s\S]+?)(?=Spidey's Take:|$)/)
    const spideyMatch = body.match(/Spidey's Take:\s*([\s\S]+?)(?=Action Steps:|$)/)
    const stepsMatch = body.match(/Action Steps:\n([\s\S]+)$/)

    const steps = stepsMatch
      ? stepsMatch[1].split('\n').filter(l => l.trim().startsWith('-')).map(l => ({ step: l.replace(/^-\s*/, '').trim(), done: false }))
      : []

    setCurrentIdea({
      title: titleMatch?.[1]?.trim() || 'New Idea',
      rawDump,
      refined: refinedMatch?.[1]?.trim() || '',
      spideyTake: spideyMatch?.[1]?.trim() || '',
      actionSteps: steps,
      status: 'planning' as IdeaStatus,
    })
  }

  const approveIdea = async () => {
    if (!currentIdea) return
    const idea: Idea = {
      id: Date.now().toString(),
      title: currentIdea.title || 'Untitled',
      rawDump: currentIdea.rawDump || dumpText,
      refined: currentIdea.refined || '',
      spideyTake: currentIdea.spideyTake || '',
      actionSteps: currentIdea.actionSteps || [],
      status: 'approved',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [],
    }
    const updated = [idea, ...ideas]
    await saveIdeas(updated)
    setView('vault')
    setDumpText('')
    setConv([])
    setCurrentIdea(null)
  }

  const toggleStep = async (ideaId: string, stepIdx: number) => {
    const updated = ideas.map(idea => {
      if (idea.id !== ideaId) return idea
      const steps = idea.actionSteps.map((s, i) => i === stepIdx ? { ...s, done: !s.done } : s)
      const allDone = steps.every(s => s.done)
      return { ...idea, actionSteps: steps, status: allDone ? 'done' as IdeaStatus : 'active' as IdeaStatus, updatedAt: new Date().toISOString() }
    })
    await saveIdeas(updated)
  }

  const deleteIdea = async (id: string) => {
    await saveIdeas(ideas.filter(i => i.id !== id))
    if (selectedId === id) { setSelectedId(null); setView('vault') }
  }

  const selectedIdea = ideas.find(i => i.id === selectedId)

  // ─── VAULT VIEW ──────────────────────────────────────────────────────────
  if (view === 'vault') {
    return (
      <div className="glass rounded-xl flex flex-col h-full overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
          <div className="w-5 h-5 rounded-md bg-yellow-500/10 flex items-center justify-center">
            <Lightbulb size={11} className="text-yellow-400" />
          </div>
          <span className="text-xs font-semibold text-text tracking-wide">Idea Vault</span>
          <span className="text-[10px] text-text-dim bg-bg-surface2 px-1.5 py-0.5 rounded">{ideas.length}</span>
          <div className="flex-1" />
          <button
            onClick={() => { setView('new'); setDumpText(''); setConv([]); setCurrentIdea(null) }}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20 transition-colors border border-yellow-400/20"
          >
            <Zap size={10} /> New Idea
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-1.5">
          {ideas.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Lightbulb size={32} className="text-yellow-400/30 mb-3" />
              <p className="text-text-dim text-xs">No ideas yet.</p>
              <p className="text-text-dim text-[10px] mt-1">Click &ldquo;New Idea&rdquo; to brain dump something.</p>
            </div>
          )}
          {ideas.map(idea => (
            <div
              key={idea.id}
              onClick={() => { setSelectedId(idea.id); setView('detail') }}
              className="glass rounded-lg p-3 cursor-pointer hover:bg-bg-surface2 transition-colors group"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-text truncate">{idea.title}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold shrink-0 ${STATUS_COLORS[idea.status]}`}>
                      {STATUS_LABELS[idea.status]}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-dim line-clamp-2 leading-relaxed">{idea.refined || idea.rawDump}</p>
                  {idea.actionSteps.length > 0 && (
                    <div className="mt-1.5 flex items-center gap-1">
                      <div className="flex-1 bg-bg-surface3 rounded-full h-1">
                        <div
                          className="bg-yellow-400 h-1 rounded-full transition-all"
                          style={{ width: `${(idea.actionSteps.filter(s => s.done).length / idea.actionSteps.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-text-dim">
                        {idea.actionSteps.filter(s => s.done).length}/{idea.actionSteps.length}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteIdea(idea.id) }}
                  className="opacity-0 group-hover:opacity-100 text-text-dim hover:text-red-400 transition-all shrink-0 mt-0.5"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ─── DETAIL VIEW ─────────────────────────────────────────────────────────
  if (view === 'detail' && selectedIdea) {
    return (
      <div className="glass rounded-xl flex flex-col h-full overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
          <button onClick={() => setView('vault')} className="text-text-dim hover:text-text text-[10px]">← Vault</button>
          <span className="text-xs font-semibold text-text truncate flex-1">{selectedIdea.title}</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${STATUS_COLORS[selectedIdea.status]}`}>
            {STATUS_LABELS[selectedIdea.status]}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-3">
          {selectedIdea.refined && (
            <div>
              <div className="text-[9px] font-semibold text-text-dim uppercase tracking-wider mb-1">The Idea</div>
              <p className="text-xs text-text leading-relaxed">{selectedIdea.refined}</p>
            </div>
          )}
          {selectedIdea.spideyTake && (
            <div className="glass rounded-lg p-2.5 border border-gold/20 bg-gold/5">
              <div className="text-[9px] font-semibold text-gold uppercase tracking-wider mb-1">⚡ Spidey&apos;s Take</div>
              <p className="text-xs text-text-dim leading-relaxed">{selectedIdea.spideyTake}</p>
            </div>
          )}
          {selectedIdea.actionSteps.length > 0 && (
            <div>
              <div className="text-[9px] font-semibold text-text-dim uppercase tracking-wider mb-1.5">Action Steps</div>
              <div className="space-y-1.5">
                {selectedIdea.actionSteps.map((step, i) => (
                  <label key={i} className="flex items-start gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={step.done}
                      onChange={() => toggleStep(selectedIdea.id, i)}
                      className="mt-0.5 accent-yellow-400 shrink-0"
                    />
                    <span className={`text-xs leading-relaxed transition-colors ${step.done ? 'line-through text-text-dim' : 'text-text'}`}>
                      {step.step}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="text-[9px] text-text-dim">
            Created {new Date(selectedIdea.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    )
  }

  // ─── NEW IDEA / REFINEMENT VIEW ──────────────────────────────────────────
  return (
    <div className="glass rounded-xl flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
        <button onClick={() => setView('vault')} className="text-text-dim hover:text-text text-[10px]">← Vault</button>
        <span className="text-xs font-semibold text-text flex-1">
          {conv.length === 0 ? 'Brain Dump' : 'Refining with Spidey'}
        </span>
        {currentIdea && (
          <button
            onClick={approveIdea}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors border border-green-500/20"
          >
            <CheckCircle size={10} /> Save to Vault
          </button>
        )}
      </div>

      {conv.length === 0 ? (
        // Brain dump input
        <div className="flex-1 flex flex-col p-3 gap-3">
          <div className="text-xs text-text-dim">Just throw it at Spidey — messy, half-formed, whatever. Spidey will help you build it out.</div>
          <textarea
            ref={textareaRef}
            value={dumpText}
            onChange={e => setDumpText(e.target.value)}
            placeholder="I have this idea about..."
            className="flex-1 bg-bg-surface2 rounded-lg p-3 text-xs text-text placeholder-text-dim resize-none border border-border focus:border-yellow-400/40 focus:outline-none leading-relaxed"
            autoFocus
          />
          <button
            onClick={startNewIdea}
            disabled={!dumpText.trim() || loading}
            className="w-full py-2.5 rounded-lg bg-yellow-400/10 text-yellow-400 text-xs font-semibold border border-yellow-400/20 hover:bg-yellow-400/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Zap size={12} />
            Refine with Spidey
          </button>
        </div>
      ) : (
        // Conversation
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-2.5">
            {conv.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gold/15 text-text border border-gold/20'
                    : 'bg-bg-surface2 text-text border border-border'
                }`}>
                  {msg.content.replace(/##IDEA##[\s\S]*?##END_IDEA##/g, '[✓ Idea structured — click Save to Vault]')}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-bg-surface2 border border-border rounded-xl px-3 py-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={convEndRef} />
          </div>
          <div className="px-3 pb-3 shrink-0 flex gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Continue refining..."
              rows={2}
              className="flex-1 bg-bg-surface2 rounded-lg px-3 py-2 text-xs text-text placeholder-text-dim resize-none border border-border focus:border-yellow-400/40 focus:outline-none"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-lg bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 hover:bg-yellow-400/20 transition-colors disabled:opacity-40 flex items-center justify-center self-end"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
