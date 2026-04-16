'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { UserAuthButton } from '@/components/UserAuthButton'
import { useAuth } from '@/hooks/useAuth'
import { useGoalStorage } from '@/hooks/useGoalStorage'
import { useAreaPermissions } from '@/hooks/useAreaPermissions'
import { LIFE_AREA_COLOR_MAP } from '@/lib/types'

interface CoachRelation {
  coach_id: string
  invited_email: string | null
}

export default function SettingsPage() {
  const router = useRouter()
  const { user, isLoaded: authLoaded } = useAuth()
  const { profile, isLoaded: profileLoaded } = useGoalStorage()
  const { permissions, isLoaded: permsLoaded, setPermission, error } = useAreaPermissions()

  const [coaches, setCoaches] = useState<CoachRelation[]>([])
  const [coachesLoaded, setCoachesLoaded] = useState(false)
  const [coachesError, setCoachesError] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoaded || !user) {
      setCoachesLoaded(true)
      return
    }
    let cancelled = false
    async function load() {
      const { data, error: fetchErr } = await supabase
        .from('coach_client_relations')
        .select('coach_id, invited_email')
        .eq('client_id', user!.id)
        .eq('status', 'active')
        .limit(100)
      if (cancelled) return
      if (fetchErr) {
        setCoachesError(fetchErr.message)
      } else {
        setCoaches((data ?? []) as CoachRelation[])
      }
      setCoachesLoaded(true)
    }
    void load()
    return () => { cancelled = true }
  }, [authLoaded, user])

  const lifeAreas = useMemo(() => profile?.lifeAreas ?? [], [profile])

  async function handleToggle(coachId: string, lifeAreaId: string, next: boolean) {
    const key = `${coachId}:${lifeAreaId}`
    setSavingKey(key)
    setSaveError(null)
    try {
      await setPermission(lifeAreaId, coachId, next)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
    } finally {
      setSavingKey(null)
    }
  }

  const isLoading = !authLoaded || !profileLoaded || !permsLoaded || !coachesLoaded

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="border-b border-gray-100 bg-white px-6 py-4 flex items-center justify-between max-w-3xl mx-auto">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </nav>
        <main className="max-w-3xl mx-auto px-6 py-8 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
        </main>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white">
        <nav className="border-b border-gray-100 bg-white px-6 py-4 flex items-center justify-between max-w-3xl mx-auto">
          <button
            type="button"
            onClick={() => router.push('/goals')}
            className="text-sm text-gray-400 hover:text-gray-700"
          >
            ← Meine Ziele
          </button>
          <UserAuthButton />
        </nav>
        <div className="flex items-center justify-center text-center px-6 mt-32">
          <div>
            <p className="text-gray-500 mb-4">Bitte melde dich an, um deine Einstellungen zu verwalten.</p>
            <Button onClick={() => router.push('/auth?from=/settings')}>Zum Login →</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="border-b border-gray-100 bg-white px-6 py-4 flex items-center justify-between max-w-3xl mx-auto">
        <button
          type="button"
          onClick={() => router.push('/goals')}
          className="text-sm text-gray-400 hover:text-gray-700"
        >
          ← Meine Ziele
        </button>
        <UserAuthButton />
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Datenschutz-Einstellungen</h1>
          <p className="text-sm text-gray-500">
            Bestimme pro Lebensbereich, was deine Coaches sehen dürfen.
          </p>
        </div>

        {(coachesError || error || saveError) && (
          <Alert variant="destructive">
            <AlertDescription>{coachesError ?? error ?? saveError}</AlertDescription>
          </Alert>
        )}

        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Coach-Zugriff
          </h2>

          {coaches.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center">
              <div className="text-2xl mb-2">🔗</div>
              <p className="text-sm font-medium text-gray-700">
                Keine aktiven Coach-Verbindungen.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Sobald du eine Einladung akzeptierst, kannst du hier Zugriffe steuern.
              </p>
            </div>
          ) : lifeAreas.length === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-500">
              Du hast noch keine Lebensbereiche definiert.{' '}
              <button
                type="button"
                onClick={() => router.push('/goals')}
                className="text-indigo-600 hover:underline"
              >
                Jetzt Ziele eingeben →
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {coaches.map((coach) => (
                <div
                  key={coach.coach_id}
                  className="rounded-xl border border-gray-100 bg-white overflow-hidden"
                >
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      {(coach.invited_email ?? '?')[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {coach.invited_email ?? coach.coach_id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-gray-400">Aktiver Coach</p>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {lifeAreas.map((area) => {
                      const key = `${coach.coach_id}:${area.id}`
                      const visible = permissions[key] ?? true
                      const colors = LIFE_AREA_COLOR_MAP[area.color]
                      const saving = savingKey === key
                      return (
                        <div
                          key={key}
                          className="px-4 py-3 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2 h-2 rounded-full ${colors.dot} flex-shrink-0`} />
                            <div className="min-w-0">
                              <Label
                                htmlFor={`perm-${key}`}
                                className="text-sm font-medium text-gray-900 cursor-pointer"
                              >
                                {area.name}
                              </Label>
                              <p className="text-xs text-gray-400">
                                {visible ? 'Coach darf diesen Bereich sehen' : 'Bereich ist gesperrt'}
                              </p>
                            </div>
                          </div>
                          <Switch
                            id={`perm-${key}`}
                            checked={visible}
                            disabled={saving}
                            onCheckedChange={(next) =>
                              handleToggle(coach.coach_id, area.id, next)
                            }
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
