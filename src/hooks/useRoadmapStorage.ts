'use client'

import { useState, useEffect, useCallback } from 'react'
import { Roadmap } from '@/lib/types'
import { supabase } from '@/lib/supabase'

const STORAGE_KEY = 'ziele_roadmap'

export function useRoadmapStorage() {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        const { data } = await supabase
          .from('roadmaps')
          .select('data')
          .eq('user_id', session.user.id)
          .maybeSingle()
        if (!cancelled) {
          if (data?.data) {
            setRoadmap(data.data as Roadmap)
          } else {
            // Supabase empty — fall back to localStorage and migrate lazily
            try {
              const raw = localStorage.getItem(STORAGE_KEY)
              if (raw) {
                const local = JSON.parse(raw) as Roadmap
                setRoadmap(local)
                supabase.from('roadmaps').upsert(
                  { user_id: session.user.id, data: local, updated_at: new Date().toISOString() },
                  { onConflict: 'user_id' }
                )
              }
            } catch { /* ignore */ }
          }
          setIsLoaded(true)
        }
      } else {
        try {
          const raw = localStorage.getItem(STORAGE_KEY)
          if (raw && !cancelled) setRoadmap(JSON.parse(raw) as Roadmap)
        } catch {
          // ignore parse errors
        }
        if (!cancelled) setIsLoaded(true)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  const saveRoadmap = useCallback(async (data: Roadmap) => {
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      await supabase.from('roadmaps').upsert(
        { user_id: session.user.id, data, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )

      // Fire-and-forget: notify any connected coaches about the roadmap update.
      // We intentionally do NOT await this — it must never block the UI.
      try {
        void fetch('/api/coach/notify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ kind: 'roadmap_updated' }),
        }).catch(() => {
          // Silently ignore — notifications are best-effort.
        })
      } catch {
        // ignore
      }
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    }
    setRoadmap(data)
  }, [])

  const clearRoadmap = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      await supabase.from('roadmaps').delete().eq('user_id', session.user.id)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
    setRoadmap(null)
  }, [])

  return { roadmap, saveRoadmap, clearRoadmap, isLoaded }
}
