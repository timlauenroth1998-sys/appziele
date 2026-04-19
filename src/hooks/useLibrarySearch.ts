'use client'

import { useState, useCallback } from 'react'
import { useAuth } from './useAuth'

export interface SearchResult {
  id: string
  document_id: string
  document_name: string
  content: string
  similarity: number
}

export function useLibrarySearch() {
  const { session } = useAuth()
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const search = useCallback(async (query: string) => {
    if (!query.trim() || !session) return
    setIsSearching(true)
    setError(null)
    setHasSearched(true)
    try {
      const res = await fetch('/api/library/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ query: query.trim(), matchCount: 5 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Suche fehlgeschlagen.')
      setResults(data as SearchResult[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suche fehlgeschlagen.')
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [session])

  const clear = useCallback(() => {
    setResults([])
    setHasSearched(false)
    setError(null)
  }, [])

  return { results, isSearching, error, hasSearched, search, clear }
}
