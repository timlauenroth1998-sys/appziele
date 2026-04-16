'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

interface DbPermission {
  coach_id: string
  client_id: string
  life_area_id: string
  is_visible: boolean
}

export interface UseAreaPermissionsResult {
  /**
   * Map keyed by `${coachId}:${lifeAreaId}` → visibility.
   * Missing keys imply the default (visible = true).
   */
  permissions: Record<string, boolean>
  isLoaded: boolean
  error: string | null
  setPermission: (lifeAreaId: string, coachId: string, visible: boolean) => Promise<void>
  refresh: () => Promise<void>
}

function keyFor(coachId: string, lifeAreaId: string): string {
  return `${coachId}:${lifeAreaId}`
}

export function useAreaPermissions(): UseAreaPermissionsResult {
  const { user, isLoaded: authLoaded } = useAuth()
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) {
      setPermissions({})
      setIsLoaded(true)
      return
    }
    const { data, error: fetchErr } = await supabase
      .from('area_permissions')
      .select('coach_id, client_id, life_area_id, is_visible')
      .eq('client_id', user.id)
      .limit(500)

    if (fetchErr) {
      setError(fetchErr.message)
      setIsLoaded(true)
      return
    }

    const map: Record<string, boolean> = {}
    for (const row of (data ?? []) as DbPermission[]) {
      map[keyFor(row.coach_id, row.life_area_id)] = row.is_visible
    }
    setPermissions(map)
    setIsLoaded(true)
  }, [user])

  useEffect(() => {
    if (!authLoaded) return
    void load()
  }, [authLoaded, load])

  const setPermission = useCallback(
    async (lifeAreaId: string, coachId: string, visible: boolean) => {
      if (!user) throw new Error('Nicht authentifiziert.')
      const { error: upsertErr } = await supabase
        .from('area_permissions')
        .upsert(
          {
            coach_id: coachId,
            client_id: user.id,
            life_area_id: lifeAreaId,
            is_visible: visible,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'coach_id,client_id,life_area_id' }
        )
      if (upsertErr) throw new Error(upsertErr.message)
      setPermissions((prev) => ({ ...prev, [keyFor(coachId, lifeAreaId)]: visible }))
    },
    [user]
  )

  return { permissions, isLoaded, error, setPermission, refresh: load }
}
