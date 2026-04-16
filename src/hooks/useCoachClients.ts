'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CoachClient, PendingInvite } from '@/lib/types'
import { useAuth } from './useAuth'

interface DbRelation {
  coach_id: string
  client_id: string
  status: 'pending' | 'active' | 'declined'
  invited_email: string | null
  created_at: string
  updated_at: string
}

export interface UseCoachClientsResult {
  clients: CoachClient[]
  pending: PendingInvite[]
  isLoaded: boolean
  error: string | null
  invite: (email: string) => Promise<void>
  disconnect: (clientId: string) => Promise<void>
  refresh: () => Promise<void>
}

function rowToClient(row: DbRelation): CoachClient {
  return {
    coachId: row.coach_id,
    clientId: row.client_id,
    clientEmail: row.invited_email,
    status: row.status,
    invitedEmail: row.invited_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToPending(row: DbRelation): PendingInvite {
  return {
    coachId: row.coach_id,
    clientId: row.client_id,
    coachEmail: null,
    invitedEmail: row.invited_email,
    status: row.status,
    createdAt: row.created_at,
  }
}

export function useCoachClients(): UseCoachClientsResult {
  const { user, session, isLoaded: authLoaded } = useAuth()
  const [clients, setClients] = useState<CoachClient[]>([])
  const [pending, setPending] = useState<PendingInvite[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) {
      setClients([])
      setPending([])
      setIsLoaded(true)
      return
    }
    const { data, error: fetchErr } = await supabase
      .from('coach_client_relations')
      .select('coach_id, client_id, status, invited_email, created_at, updated_at')
      .eq('coach_id', user.id)
      .limit(200)

    if (fetchErr) {
      setError(fetchErr.message)
      setIsLoaded(true)
      return
    }

    const rows = (data ?? []) as DbRelation[]
    setClients(rows.filter((r) => r.status === 'active').map(rowToClient))
    setPending(rows.filter((r) => r.status === 'pending').map(rowToPending))
    setIsLoaded(true)
  }, [user])

  useEffect(() => {
    if (!authLoaded) return
    void load()
  }, [authLoaded, load])

  const invite = useCallback(async (email: string) => {
    if (!session) throw new Error('Nicht authentifiziert.')
    const res = await fetch('/api/coach/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ email }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error ?? 'Einladung fehlgeschlagen.')
    await load()
  }, [session, load])

  const disconnect = useCallback(async (clientId: string) => {
    if (!session) throw new Error('Nicht authentifiziert.')
    const res = await fetch('/api/coach/disconnect', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ partnerId: clientId }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error ?? 'Verbindung konnte nicht getrennt werden.')
    await load()
  }, [session, load])

  return { clients, pending, isLoaded, error, invite, disconnect, refresh: load }
}
