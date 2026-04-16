'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const STORAGE_KEY = 'ziele_completions'

export function useCompletions() {
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        const { data } = await supabase
          .from('completions')
          .select('item_ids')
          .eq('user_id', session.user.id)
          .maybeSingle()
        if (!cancelled) {
          const ids = (data?.item_ids as string[]) ?? []
          setCompleted(new Set(ids))
          setIsLoaded(true)
        }
      } else {
        try {
          const raw = localStorage.getItem(STORAGE_KEY)
          if (raw && !cancelled) setCompleted(new Set(JSON.parse(raw) as string[]))
        } catch {
          // ignore
        }
        if (!cancelled) setIsLoaded(true)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  const toggle = useCallback((id: string) => {
    setCompleted(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      const ids = [...next]

      // Persist asynchronously (optimistic update already applied above)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          supabase.from('completions').upsert(
            { user_id: session.user.id, item_ids: ids, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
          )
        } else {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
        }
      })

      return next
    })
  }, [])

  const isCompleted = useCallback((id: string) => completed.has(id), [completed])

  const getProgress = useCallback((items: { id: string }[]): number => {
    if (!items.length) return 0
    const done = items.filter(i => completed.has(i.id)).length
    return Math.round((done / items.length) * 100)
  }, [completed])

  return { completed, toggle, isCompleted, getProgress, isLoaded }
}
