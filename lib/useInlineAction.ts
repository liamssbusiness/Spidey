import { useState, useCallback } from 'react'

interface InlineActionState {
  loading: boolean
  result: string | null
  error: string | null
}

export function useInlineAction() {
  const [state, setState] = useState<InlineActionState>({ loading: false, result: null, error: null })

  const run = useCallback(async (prompt: string) => {
    setState({ loading: true, result: null, error: null })
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      })
      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const text = await res.text()
      setState({ loading: false, result: text, error: null })
      return text
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setState({ loading: false, result: null, error: msg })
      return null
    }
  }, [])

  const clear = useCallback(() => {
    setState({ loading: false, result: null, error: null })
  }, [])

  return { ...state, run, clear }
}
