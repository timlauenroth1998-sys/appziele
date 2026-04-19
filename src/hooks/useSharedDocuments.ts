'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './useAuth'

export interface SharedDoc {
  documentId: string
  coachId: string
  sharedAt: string
  document: {
    id: string
    name: string
    size_bytes: number
    chunk_count: number
  } | null
}

export function useSharedDocuments() {
  const { session } = useAuth()
  const [docs, setDocs] = useState<SharedDoc[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!session) return
    setIsLoaded(false)
    setError(null)
    try {
      const res = await fetch('/api/library/shared', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Laden fehlgeschlagen.')
      setDocs(data as SharedDoc[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen.')
    } finally {
      setIsLoaded(true)
    }
  }, [session])

  useEffect(() => { void load() }, [load])

  const fetchContent = useCallback(async (documentId: string): Promise<{ name: string; text: string } | null> => {
    if (!session) return null
    try {
      const res = await fetch(`/api/library/content/${documentId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) return null
      const data = await res.json() as { name: string; text: string }
      return data
    } catch {
      return null
    }
  }, [session])

  return { docs, isLoaded, error, fetchContent, refresh: load }
}
