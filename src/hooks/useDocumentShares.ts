'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './useAuth'

export interface LibraryDocument {
  id: string
  name: string
  size_bytes: number
  chunk_count: number
  created_at: string
}

export function useDocumentShares(clientId: string) {
  const { session } = useAuth()
  const [documents, setDocuments] = useState<LibraryDocument[]>([])
  const [sharedIds, setSharedIds] = useState<Set<string>>(new Set())
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)

  const authHeader = useCallback(
    () => ({ Authorization: `Bearer ${session?.access_token ?? ''}` }),
    [session]
  )

  const load = useCallback(async () => {
    if (!session || !clientId) return
    setIsLoaded(false)
    setError(null)
    try {
      // Load all library documents
      const [docsRes, sharesRes] = await Promise.all([
        fetch('/api/library/documents', { headers: authHeader() }),
        fetch(`/api/library/share?clientId=${clientId}`, { headers: authHeader() }),
      ])
      const docsData = await docsRes.json()
      if (!docsRes.ok) throw new Error(docsData.error ?? 'Dokumente laden fehlgeschlagen.')
      setDocuments(docsData as LibraryDocument[])

      // Load existing shares for this client
      if (sharesRes.ok) {
        const sharesData = await sharesRes.json() as Array<{ documentId: string }>
        setSharedIds(new Set(sharesData.map((s) => s.documentId)))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen.')
    } finally {
      setIsLoaded(true)
    }
  }, [session, clientId, authHeader])

  useEffect(() => { void load() }, [load])

  const share = useCallback(async (documentId: string) => {
    if (!session) return
    setActing(documentId)
    try {
      const res = await fetch('/api/library/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ documentId, clientId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Teilen fehlgeschlagen.')
      setSharedIds((prev) => new Set([...prev, documentId]))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Teilen fehlgeschlagen.')
    } finally {
      setActing(null)
    }
  }, [session, clientId, authHeader])

  const unshare = useCallback(async (documentId: string) => {
    if (!session) return
    setActing(documentId)
    try {
      const res = await fetch('/api/library/share', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ documentId, clientId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Teilen aufheben fehlgeschlagen.')
      setSharedIds((prev) => { const s = new Set(prev); s.delete(documentId); return s })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Teilen aufheben fehlgeschlagen.')
    } finally {
      setActing(null)
    }
  }, [session, clientId, authHeader])

  return { documents, sharedIds, isLoaded, error, acting, share, unshare, refresh: load }
}
