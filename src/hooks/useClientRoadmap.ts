'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { GoalProfile, Roadmap } from '@/lib/types'
import { useAuth } from './useAuth'

export interface UseClientRoadmapResult {
  roadmap: Roadmap | null
  profile: GoalProfile | null
  isLoaded: boolean
  error: string | null
}

/**
 * Coach-side hook: reads a connected client's goal_profile + roadmap.
 * The DB RLS policies (see PROJ-6 migration) allow a coach to SELECT rows
 * of `goal_profiles` and `roadmaps` whenever an active `coach_client_relations`
 * row exists between the two users.
 */
export function useClientRoadmap(clientId: string | null | undefined): UseClientRoadmapResult {
  const { user, isLoaded: authLoaded } = useAuth()
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [profile, setProfile] = useState<GoalProfile | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoaded) return
    let cancelled = false

    async function load() {
      if (!user || !clientId) {
        if (!cancelled) {
          setRoadmap(null)
          setProfile(null)
          setIsLoaded(true)
        }
        return
      }

      const [profileRes, roadmapRes] = await Promise.all([
        supabase
          .from('goal_profiles')
          .select('data')
          .eq('user_id', clientId)
          .maybeSingle(),
        supabase
          .from('roadmaps')
          .select('data')
          .eq('user_id', clientId)
          .maybeSingle(),
      ])

      if (cancelled) return

      if (profileRes.error) setError(profileRes.error.message)
      if (roadmapRes.error) setError(roadmapRes.error.message)

      setProfile(profileRes.data?.data ? (profileRes.data.data as GoalProfile) : null)
      setRoadmap(roadmapRes.data?.data ? (roadmapRes.data.data as Roadmap) : null)
      setIsLoaded(true)
    }

    void load()
    return () => { cancelled = true }
  }, [authLoaded, user, clientId])

  return { roadmap, profile, isLoaded, error }
}
