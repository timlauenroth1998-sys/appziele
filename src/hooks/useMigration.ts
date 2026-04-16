'use client'

import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const MIGRATION_KEY = 'ziele_migrated'
const PROFILE_KEY = 'ziele_goal_profile'
const ROADMAP_KEY = 'ziele_roadmap'
const COMPLETIONS_KEY = 'ziele_completions'

/**
 * Migrates localStorage data to Supabase after first login.
 * Runs silently — no UI feedback. Cloud-first: only writes if no cloud data exists yet.
 */
export function useMigration() {
  const migrate = useCallback(async (userId: string) => {
    // Only migrate once per user (per browser)
    const migrationDone = localStorage.getItem(`${MIGRATION_KEY}_${userId}`)
    if (migrationDone) return

    try {
      const now = new Date().toISOString()

      // Migrate goal profile (only if no cloud data exists)
      const localProfile = localStorage.getItem(PROFILE_KEY)
      if (localProfile) {
        const { data: existing } = await supabase
          .from('goal_profiles')
          .select('user_id')
          .eq('user_id', userId)
          .maybeSingle()

        if (!existing) {
          await supabase.from('goal_profiles').insert({
            user_id: userId,
            data: JSON.parse(localProfile),
            updated_at: now,
          })
        }
      }

      // Migrate roadmap (only if no cloud data exists)
      const localRoadmap = localStorage.getItem(ROADMAP_KEY)
      if (localRoadmap) {
        const { data: existing } = await supabase
          .from('roadmaps')
          .select('user_id')
          .eq('user_id', userId)
          .maybeSingle()

        if (!existing) {
          await supabase.from('roadmaps').insert({
            user_id: userId,
            data: JSON.parse(localRoadmap),
            updated_at: now,
          })
        }
      }

      // Migrate completions (only if no cloud data exists)
      const localCompletions = localStorage.getItem(COMPLETIONS_KEY)
      if (localCompletions) {
        const { data: existing } = await supabase
          .from('completions')
          .select('user_id')
          .eq('user_id', userId)
          .maybeSingle()

        if (!existing) {
          await supabase.from('completions').insert({
            user_id: userId,
            item_ids: JSON.parse(localCompletions),
            updated_at: now,
          })
        }
      }

      // Mark as migrated so we don't run again
      localStorage.setItem(`${MIGRATION_KEY}_${userId}`, '1')
    } catch {
      // Silent failure — migration is best-effort, not critical
    }
  }, [])

  return { migrate }
}
