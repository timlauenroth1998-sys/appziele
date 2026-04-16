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
          setRoadmap((data?.data as Roadmap) ?? null)
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
