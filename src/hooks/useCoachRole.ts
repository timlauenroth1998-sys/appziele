'use client'

import { useAuth } from './useAuth'

export interface CoachRoleState {
  isCoach: boolean
  isAdmin: boolean
  isLoaded: boolean
}

/**
 * Derives coach / admin role from `user.user_metadata.role`.
 * - 'coach'   → isCoach = true
 * - 'admin'   → isAdmin = true (admins are implicitly treated as coaches too)
 * - anything else → both false
 */
export function useCoachRole(): CoachRoleState {
  const { user, isLoaded } = useAuth()
  const meta = user?.user_metadata as Record<string, unknown> | undefined
  // Supabase reserves 'role' in JWT — use 'app_role' to avoid collision
  const appRole = meta?.app_role ?? meta?.role
  const isAdmin = appRole === 'admin'
  const isCoach = isAdmin || appRole === 'coach'
  return { isCoach, isAdmin, isLoaded }
}
