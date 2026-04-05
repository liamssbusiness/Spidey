'use client'

import { useSession, signIn } from 'next-auth/react'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { LayoutDashboard, Mail, Calendar, Zap, CheckSquare, FileText, Timer, Brain, Sunrise, Globe, Mic, Lightbulb } from 'lucide-react'
import TopNav from '@/components/TopNav'
import ChatPanel from '@/components/ChatPanel'
import EmailWidget from '@/components/EmailWidget'
import CalendarWidget from '@/components/CalendarWidget'
import QuickActionsWidget from '@/components/QuickActionsWidget'
import DailyBriefWidget from '@/components/DailyBriefWidget'
import TasksWidget from '@/components/TasksWidget'
import NotesWidget from '@/components/NotesWidget'
import FocusTimerWidget from '@/components/FocusTimerWidget'
import SpideyMemoryWidget from '@/components/SpideyMemoryWidget'
import MorningBriefWidget from '@/components/MorningBriefWidget'
import CivSimWidget from '@/components/CivSimWidget'
import VoiceOrb from '@/components/VoiceOrb'
import IdeaVaultWidget from '@/components/IdeaVaultWidget'
import TelegramSetupWidget from '@/components/TelegramSetupWidget'

const AUTH_ERRORS: Record<string, string> = {
  OAuthCallback: 'Google sign-in failed. Try again.',
  OAuthSignin: 'Could not start Google sign-in.',
  OAuthCreateAccount: 'Could not create account.',
  Callback: 'Sign-in callback error.',
  google: 'Google auth error — try signing in again.',
}

type Tab = 'hub' | 'inbox' | 'calendar' | 'tasks' | 'notes' | 'focus' | 'brief' | 'civ' | 'vault'

const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: 'hub',      label: 'Hub',      Icon: LayoutDashboard },
  { id: 'inbox',    label: 'Inbox',    Icon: Mail },
  { id: 'calendar', label: 'Calendar', Icon: Calendar },
  { id: 'tasks',    label: 'Tasks',    Icon: CheckSquare },
  { id: 'vault',    label: 'Vault',    Icon: Lightbulb },
  { id: 'notes',    label: 'Notes',    Icon: FileText },
  { id: 'focus',    label: 'Focus',    Icon: Timer },
  { id: 'brief',    label: 'Brief',    Icon: Sunrise },
  { id: 'civ',      label: 'Civ',      Icon: Globe },
]

function SignInPanel() {
  const searchParams = useSearchParams()
  const authError = searchParams.get('error')

  return (
    <div className="flex items-center justify-center min-h-screen bg-bg-primary">
      <div className="glass rounded-2xl p-12 text-center max-w-md w-full mx-4">
        <div className="text-6xl mb-6">⚡</div>
        <h1 className="text-3xl font-bold text-text mb-2 tracking-tight">Spidey</h1>
        <p className="text-text-muted text-sm mb-8 leading-relaxed">
          Your personal AI assistant. Powered by luxury intelligence.
        </p>
        {authError && (
          <div className="bg-red-900/40 border border-red-500/50 rounded-lg px-4 py-3 mb-4 text-xs text-red-300 text-left">
            <span className="font-semibold">Error ({authError}):</span>{' '}
            {AUTH_ERRORS[authError] ?? `Auth failed — check console for details.`}
          </div>
        )}
        <button
          onClick={() => signIn('google', { callbackUrl: '/' })}
          className="btn-gold w-full py-3 px-6 rounded-xl font-semibold text-sm tracking-wide transition-all duration-200"
        >
          Sign in with Google
        </button>
        <p className="text-text-dim text-xs mt-4">
          Connects to your Gmail &amp; Google Calendar
        </p>
      </div>
    </div>
  )
}

export default function Home() {
  const { data: session, status } = useSession()
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('hub')
  const [jarvisOpen, setJarvisOpen] = useState(false)

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-primary">
        <div className="text-center">
          <div className="text-5xl mb-4">⚡</div>
          <p className="text-text-muted text-sm tracking-widest uppercase">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen bg-bg-primary">
          <div className="text-5xl">⚡</div>
        </div>
      }>
        <SignInPanel />
      </Suspense>
    )
  }

  const userName = session.user?.name?.split(' ')[0] ?? 'Liam'

  return (
    <div className="flex flex-col h-screen bg-bg-primary overflow-hidden">
      {/* Luxury scan line overlay */}
      <div className="scan-line" />

      <TopNav
        user={session.user}
        voiceEnabled={voiceEnabled}
        onVoiceToggle={() => setVoiceEnabled(v => !v)}
      />

      <main className="flex flex-1 overflow-hidden gap-3 p-3 pt-0 min-h-0">
        {/* Left: tabbed panel */}
        <div className="flex flex-col w-[52%] min-h-0 overflow-hidden">

          {/* Tab bar — scrollable so all 7 fit on any screen */}
          <div className="flex gap-1 pt-2 pb-1.5 shrink-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border whitespace-nowrap flex-shrink-0 ${
                  activeTab === id
                    ? 'bg-gold/15 text-gold border-gold/30'
                    : 'text-text-dim hover:text-text hover:bg-bg-surface2 border-transparent'
                }`}
              >
                <Icon size={10} />
                {label}
              </button>
            ))}
          </div>

          {/* Hub: 2×2 scrollable */}
          {activeTab === 'hub' && (
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="grid grid-cols-2 gap-3 pb-3" style={{ gridTemplateRows: '300px 260px' }}>
                <EmailWidget />
                <CalendarWidget />
                <QuickActionsWidget onAction={setChatInput} />
                <DailyBriefWidget userName={userName} />
              </div>
            </div>
          )}

          {/* Inbox */}
          {activeTab === 'inbox' && (
            <div className="flex-1 min-h-0 overflow-hidden pb-3">
              <EmailWidget />
            </div>
          )}

          {/* Calendar */}
          {activeTab === 'calendar' && (
            <div className="flex-1 min-h-0 overflow-hidden pb-3">
              <CalendarWidget />
            </div>
          )}

          {/* Tasks */}
          {activeTab === 'tasks' && (
            <div className="flex-1 min-h-0 overflow-hidden pb-3">
              <TasksWidget onAsk={setChatInput} />
            </div>
          )}

          {/* Notes */}
          {activeTab === 'notes' && (
            <div className="flex-1 min-h-0 overflow-hidden pb-3">
              <NotesWidget />
            </div>
          )}

          {/* Focus: timer + actions side by side */}
          {activeTab === 'focus' && (
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="grid grid-cols-2 gap-3 pb-3" style={{ gridTemplateRows: '360px' }}>
                <FocusTimerWidget onAsk={setChatInput} />
                <div className="flex flex-col gap-3">
                  <QuickActionsWidget onAction={setChatInput} />
                </div>
              </div>
            </div>
          )}

          {/* Brief: morning brief + memory + telegram */}
          {activeTab === 'brief' && (
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="grid grid-cols-2 gap-3 pb-3" style={{ gridTemplateRows: '380px 300px' }}>
                <MorningBriefWidget />
                <SpideyMemoryWidget />
                <TelegramSetupWidget />
              </div>
            </div>
          )}

          {/* Vault: idea vault */}
          {activeTab === 'vault' && (
            <div className="flex-1 min-h-0 overflow-hidden pb-3">
              <IdeaVaultWidget />
            </div>
          )}

          {/* Civ: civilization simulation */}
          {activeTab === 'civ' && (
            <div className="flex-1 min-h-0 overflow-hidden pb-3">
              <CivSimWidget />
            </div>
          )}
        </div>

        {/* Right: Chat panel */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <ChatPanel
            voiceEnabled={voiceEnabled}
            externalInput={chatInput}
            onExternalInputConsumed={() => setChatInput('')}
          />
        </div>
      </main>

      {/* Floating voice orb — toggle on/off */}
      {jarvisOpen ? (
        <VoiceOrb onClose={() => setJarvisOpen(false)} />
      ) : (
        <button
          onClick={() => setJarvisOpen(true)}
          title="Talk to Spidey"
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gold/15 border-2 border-gold/40 shadow-lg shadow-gold/20 flex items-center justify-center text-gold hover:bg-gold/25 hover:scale-110 active:scale-95 transition-all duration-200"
        >
          <Mic size={22} />
        </button>
      )}
    </div>
  )
}
