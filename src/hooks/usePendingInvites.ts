'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PendingInvite } from '@/lib/types'
import { useAuth } from './useAuth'

interface DbRelation {
  coach_id: string
  client_id: string
  status: 'pending' | 'active' | 'declined'
  invited_email: string | null
  created_at: string
}

export interface UsePendingInvitesResult {
  invites: PendingInvite[]
  isLoaded: boolean
  error: string | null
  respond: (coachId: string, action: 'accept' | 'decline') => Promise<void>
  refresh: () => Promise<void>
}

export function usePendingInvites(): UsePendingInvitesResult {
  const { user, session, isLoaded: authLoaded } = useAuth()
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) {
      setInvites([])
      setIsLoaded(true)
      return
    }
    const { data, error: fetchErr } = await supabase
      .from('coach_client_relations')
      .select('coach_id, client_id, status, invited_email, created_at')
      .eq('client_id', user.id)
      .eq('status', 'pending')
      .limit(100)

    if (fetchErr) {
      setError(fetchErr.message)
      setIsLoaded(true)
      return
    }

    const rows = (data ?? []) as DbRelation[]
    setInvites(
      rows.map((r) => ({
        coachId: r.coach_id,
        clientId: r.client_id,
        coachEmail: null,
        invitedEmail: r.invited_email,
        status: r.status,
        createdAt: r.created_at,
      }))
    )
    setIsLoaded(true)
  }, [user])

  useEffect(() => {
    if (!authLoaded) return
    void load()
  }, [authLoaded, load])

  const respond = useCallback(async (coachId: string, action: 'accept' | 'decline') => {
    if (!session) throw new Error('Nicht authentifiziert.')
    const res = await fetch('/api/coach/respond', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ coachId, action }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error ?? 'Antwort fehlgeschlagen.')
    await load()
  }, [session, load])

  return { invites, isLoaded, error, respond, refresh: load }
}
