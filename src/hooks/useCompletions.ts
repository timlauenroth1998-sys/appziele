'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'ziele_completions'

export function useCompletions() {
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setCompleted(new Set(JSON.parse(raw) as string[]))
    } catch {
      // ignore
    }
    setIsLoaded(true)
  }, [])

  const toggle = useCallback((id: string) => {
    setCompleted(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
      return next
    })
  }, [])

  const isCompleted = useCallback((id: string) => completed.has(id), [completed])

  const getProgress = useCallback((items: { id: string }[]): number => {
    if (!items.length) return 0
    const done = items.filter(i => completed.has(i.id)).length
    return Math.round((done / items.length) * 100)
  }, [completed])

  return { completed, toggle, isCompleted, getProgress, isLoaded }
}
