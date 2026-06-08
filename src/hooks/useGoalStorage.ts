'use client'

import { useState, useEffect, useCallback } from 'react'
import { GoalProfile } from '@/lib/types'
import { supabase } from '@/lib/supabase'

const STORAGE_KEY = 'ziele_goal_profile'

export function useGoalStorage() {
  const [profile, setProfile] = useState<GoalProfile | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      let session = null
      try {
        const res = await supabase.auth.getSession()
        session = res.data.session
      } catch { /* Supabase unreachable — fall through to localStorage */ }

      if (session?.user) {
        let loaded = false
        try {
          const { data } = await supabase
            .from('goal_profiles')
            .select('data')
            .eq('user_id', session.user.id)
            .maybeSingle()
          if (!cancelled && data?.data) {
            setProfile(data.data as GoalProfile)
            loaded = true
          }
        } catch { /* Supabase unreachable */ }

        if (!loaded) {
          // Supabase empty or unreachable — fall back to localStorage
          try {
            const raw = localStorage.getItem(STORAGE_KEY)
            if (raw && !cancelled) {
              const local = JSON.parse(raw) as GoalProfile
              setProfile(local)
              // Migrate to Supabase in background
              void supabase.from('goal_profiles').upsert(
                { user_id: session.user.id, data: local, updated_at: new Date().toISOString() },
                { onConflict: 'user_id' }
              )
            }
          } catch { /* ignore */ }
        }
      } else {
        // Not logged in: load from localStorage
        try {
          const raw = localStorage.getItem(STORAGE_KEY)
          if (raw && !cancelled) setProfile(JSON.parse(raw) as GoalProfile)
        } catch { /* ignore */ }
      }

      if (!cancelled) setIsLoaded(true)
    }

    load()
    return () => { cancelled = true }
  }, [])

  const saveProfile = useCallback(async (data: GoalProfile) => {
    const updated = { ...data, updatedAt: new Date().toISOString() }

    // Always save to localStorage as offline backup
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch { /* ignore */ }

    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await supabase.from('goal_profiles').upsert(
        { user_id: session.user.id, data: updated, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    }
    setProfile(updated)
  }, [])

  const clearProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      await supabase.from('goal_profiles').delete().eq('user_id', session.user.id)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
    setProfile(null)
  }, [])

  return { profile, saveProfile, clearProfile, isLoaded }
}
