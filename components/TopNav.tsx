'use client'

import { signOut } from 'next-auth/react'
import { Volume2, VolumeX, LogOut } from 'lucide-react'
import clsx from 'clsx'

interface TopNavProps {
  user: { name?: string | null; image?: string | null; email?: string | null }
  voiceEnabled: boolean
  onVoiceToggle: () => void
}

export default function TopNav({ user, voiceEnabled, onVoiceToggle }: TopNavProps) {
  return (
    <nav className="glass border-b border-border flex items-center px-4 h-14 gap-4 shrink-0 relative z-10">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-4">
        <span className="text-xl">⚡</span>
        <span className="font-bold text-text tracking-tight text-lg">Spidey</span>
        <span className="text-[10px] font-medium text-gold uppercase tracking-widest ml-1 opacity-80">
          AI
        </span>
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-border" />

      {/* Status indicator */}
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
        <span className="text-xs text-text-muted">Online</span>
      </div>

      <div className="flex-1" />

      {/* Voice toggle */}
      <button
        onClick={onVoiceToggle}
        className={clsx(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border',
          voiceEnabled
            ? 'bg-gold/10 border-gold/40 text-gold'
            : 'bg-bg-surface2 border-border text-text-muted hover:border-border hover:text-text'
        )}
      >
        {voiceEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
        {voiceEnabled ? 'Voice On' : 'Voice Off'}
      </button>

      {/* Divider */}
      <div className="h-5 w-px bg-border" />

      {/* User */}
      <div className="flex items-center gap-2">
        {user.image ? (
          <img
            src={user.image}
            alt={user.name ?? ''}
            className="w-7 h-7 rounded-full border border-border"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center text-xs font-bold text-gold">
            {user.name?.[0] ?? 'L'}
          </div>
        )}
        <span className="text-sm text-text-muted hidden sm:block">
          {user.name?.split(' ')[0]}
        </span>
        <button
          onClick={() => signOut()}
          className="p-1.5 rounded-lg text-text-dim hover:text-text-muted hover:bg-bg-surface3 transition-colors"
          title="Sign out"
        >
          <LogOut size={13} />
        </button>
      </div>
    </nav>
  )
}
