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
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        // Logged in: load from Supabase, fall back to localStorage if empty
        const { data } = await supabase
          .from('goal_profiles')
          .select('data')
          .eq('user_id', session.user.id)
          .maybeSingle()
        if (!cancelled) {
          if (data?.data) {
            setProfile(data.data as GoalProfile)
          } else {
            // Supabase empty — try localStorage and migrate lazily
            try {
              const raw = localStorage.getItem(STORAGE_KEY)
              if (raw) {
                const local = JSON.parse(raw) as GoalProfile
                setProfile(local)
                // Silently upload to Supabase so future loads work
                supabase.from('goal_profiles').upsert(
                  { user_id: session.user.id, data: local, updated_at: new Date().toISOString() },
                  { onConflict: 'user_id' }
                )
              }
            } catch { /* ignore */ }
          }
          setIsLoaded(true)
        }
      } else {
        // Not logged in: load from localStorage
        try {
          const raw = localStorage.getItem(STORAGE_KEY)
          if (raw && !cancelled) setProfile(JSON.parse(raw) as GoalProfile)
        } catch {
          // ignore parse errors
        }
        if (!cancelled) setIsLoaded(true)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  const saveProfile = useCallback(async (data: GoalProfile) => {
    const updated = { ...data, updatedAt: new Date().toISOString() }
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      await supabase.from('goal_profiles').upsert(
        { user_id: session.user.id, data: updated, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
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
