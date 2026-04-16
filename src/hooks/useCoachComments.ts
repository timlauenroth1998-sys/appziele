'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { RoadmapComment } from '@/lib/types'
import { useAuth } from './useAuth'

interface DbComment {
  id: string
  coach_id: string
  client_id: string
  item_id: string
  comment: string
  created_at: string
}

export interface UseCoachCommentsResult {
  comments: RoadmapComment[]
  isLoaded: boolean
  error: string | null
  addComment: (text: string) => Promise<void>
  deleteComment: (id: string) => Promise<void>
  refresh: () => Promise<void>
}

function rowToComment(row: DbComment): RoadmapComment {
  return {
    id: row.id,
    coachId: row.coach_id,
    clientId: row.client_id,
    itemId: row.item_id,
    comment: row.comment,
    createdAt: row.created_at,
  }
}

export function useCoachComments(
  itemId: string | null | undefined,
  clientId: string | null | undefined
): UseCoachCommentsResult {
  const { user, isLoaded: authLoaded } = useAuth()
  const [comments, setComments] = useState<RoadmapComment[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user || !itemId || !clientId) {
      setComments([])
      setIsLoaded(true)
      return
    }
    const { data, error: fetchErr } = await supabase
      .from('roadmap_comments')
      .select('id, coach_id, client_id, item_id, comment, created_at')
      .eq('item_id', itemId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: true })
      .limit(200)

    if (fetchErr) {
      setError(fetchErr.message)
      setIsLoaded(true)
      return
    }
    setComments(((data ?? []) as DbComment[]).map(rowToComment))
    setIsLoaded(true)
  }, [user, itemId, clientId])

  useEffect(() => {
    if (!authLoaded) return
    void load()
  }, [authLoaded, load])

  const addComment = useCallback(
    async (text: string) => {
      if (!user) throw new Error('Nicht authentifiziert.')
      if (!itemId || !clientId) throw new Error('Ungültiger Kontext.')
      const trimmed = text.trim()
      if (!trimmed) throw new Error('Kommentar darf nicht leer sein.')
      if (trimmed.length > 500) throw new Error('Kommentar darf max. 500 Zeichen lang sein.')

      const { data, error: insertErr } = await supabase
        .from('roadmap_comments')
        .insert({
          coach_id: user.id,
          client_id: clientId,
          item_id: itemId,
          comment: trimmed,
        })
        .select('id, coach_id, client_id, item_id, comment, created_at')
        .single()

      if (insertErr) throw new Error(insertErr.message)
      if (data) setComments((prev) => [...prev, rowToComment(data as DbComment)])
    },
    [user, itemId, clientId]
  )

  const deleteComment = useCallback(
    async (id: string) => {
      const { error: deleteErr } = await supabase
        .from('roadmap_comments')
        .delete()
        .eq('id', id)
      if (deleteErr) throw new Error(deleteErr.message)
      setComments((prev) => prev.filter((c) => c.id !== id))
    },
    []
  )

  return { comments, isLoaded, error, addComment, deleteComment, refresh: load }
}
