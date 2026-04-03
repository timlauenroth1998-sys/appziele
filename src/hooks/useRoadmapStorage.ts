'use client'

import { useState, useEffect, useCallback } from 'react'
import { Roadmap } from '@/lib/types'

const STORAGE_KEY = 'ziele_roadmap'

export function useRoadmapStorage() {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setRoadmap(JSON.parse(raw))
    } catch {
      // ignore parse errors
    }
    setIsLoaded(true)
  }, [])

  const saveRoadmap = useCallback((data: Roadmap) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    setRoadmap(data)
  }, [])

  const clearRoadmap = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setRoadmap(null)
  }, [])

  return { roadmap, saveRoadmap, clearRoadmap, isLoaded }
}
