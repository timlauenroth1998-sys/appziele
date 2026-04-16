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
  const role = (user?.user_metadata as Record<string, unknown> | undefined)?.role
  const isAdmin = role === 'admin'
  const isCoach = isAdmin || role === 'coach'
  return { isCoach, isAdmin, isLoaded }
}
