'use client'

import { useState, useEffect, useCallback } from 'react'
import { GoalProfile } from '@/lib/types'

const STORAGE_KEY = 'ziele_goal_profile'

export function useGoalStorage() {
  const [profile, setProfile] = useState<GoalProfile | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        setProfile(JSON.parse(raw))
      }
    } catch {
      // ignore parse errors
    }
    setIsLoaded(true)
  }, [])

  const saveProfile = useCallback((data: GoalProfile) => {
    const updated = { ...data, updatedAt: new Date().toISOString() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setProfile(updated)
  }, [])

  const clearProfile = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setProfile(null)
  }, [])

  return { profile, saveProfile, clearProfile, isLoaded }
}
