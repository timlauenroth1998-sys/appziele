'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { useGoalStorage } from '@/hooks/useGoalStorage'
import { useRoadmapStorage } from '@/hooks/useRoadmapStorage'
import { TimelineAccordion } from '@/components/roadmap/TimelineAccordion'
import { Roadmap, RoadmapItem, LIFE_AREA_COLOR_MAP } from '@/lib/types'

type Status = 'idle' | 'generating' | 'done' | 'error'

function profileHash(profile: { lifeAreas: unknown[] }): string {
  try {
    return btoa(JSON.stringify(profile.lifeAreas)).slice(0, 16)
  } catch {
    return ''
  }
}

const GENERATING_MESSAGES = [
  'Analysiere deine Ziele...',
  'Erstelle 5-Jahres-Vision...',
  'Plane Quartalsziele...',
  'Optimiere Monatsziele...',
  'Finalisiere deinen Fahrplan...',
]

export default function RoadmapPage() {
  const router = useRouter()
  const { profile, isLoaded: profileLoaded } = useGoalStorage()
  const { roadmap, saveRoadmap, isLoaded: roadmapLoaded } = useRoadmapStorage()

  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState(GENERATING_MESSAGES[0])
  const [localRoadmap, setLocalRoadmap] = useState<Roadmap | null>(null)

  // Sync local state from storage
  useEffect(() => {
    if (roadmapLoaded && roadmap) setLocalRoadmap(roadmap)
  }, [roadmapLoaded, roadmap])

  // Auto-generate if no roadmap exists yet
  useEffect(() => {
    if (profileLoaded && roadmapLoaded && !roadmap && profile && status === 'idle') {
      generate()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLoaded, roadmapLoaded])

  const generate = useCallback(async () => {
    if (!profile) return
    setStatus('generating')
    setError('')
    setProgress(0)

    // Animate progress while waiting
    let msgIdx = 0
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + 12, 88))
      msgIdx = (msgIdx + 1) % GENERATING_MESSAGES.length
      setProgressMsg(GENERATING_MESSAGES[msgIdx])
    }, 1200)

    try {
      const res = await fetch('/api/roadmap/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })

      clearInterval(interval)

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Unbekannter Fehler')
      }

      const data: Roadmap = await res.json()
      setProgress(100)
      saveRoadmap(data)
      setLocalRoadmap(data)
      setStatus('done')
    } catch (err) {
      clearInterval(interval)
      setError(err instanceof Error ? err.message : 'Generierung fehlgeschlagen.')
      setStatus('error')
    }
  }, [profile, saveRoadmap])

  const updateItem = useCallback((
    lifeAreaId: string,
    section: string,
    subKey: string | null,
    updatedItem: RoadmapItem
  ) => {
    if (!localRoadmap) return

    const updated: Roadmap = {
      ...localRoadmap,
      lifeAreaRoadmaps: localRoadmap.lifeAreaRoadmaps.map(lar => {
        if (lar.lifeAreaId !== lifeAreaId) return lar
        const tl = { ...lar.timeline }

        if (section === 'vision5y' || section === 'goals3y' || section === 'goals1y') {
          const key = section as 'vision5y' | 'goals3y' | 'goals1y'
          tl[key] = tl[key].map(i => i.id === updatedItem.id ? updatedItem : i)
        } else if (section === 'quarters' && subKey) {
          const q = subKey as keyof typeof tl.quarters
          tl.quarters = { ...tl.quarters, [q]: tl.quarters[q].map(i => i.id === updatedItem.id ? updatedItem : i) }
        } else if (section === 'months' && subKey) {
          const m = subKey as keyof typeof tl.months
          tl.months = { ...tl.months, [m]: tl.months[m].map(i => i.id === updatedItem.id ? updatedItem : i) }
        } else if (section === 'weeks' && subKey) {
          const w = subKey as keyof typeof tl.weeks
          tl.weeks = { ...tl.weeks, [w]: tl.weeks[w].map(i => i.id === updatedItem.id ? updatedItem : i) }
        }

        return { ...lar, timeline: tl }
      }),
    }

    setLocalRoadmap(updated)
    saveRoadmap(updated)
  }, [localRoadmap, saveRoadmap])

  if (!profileLoaded || !roadmapLoaded) {
    return (
      <div className="min-h-screen bg-white max-w-3xl mx-auto px-6 pt-16 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-center px-6">
        <div>
          <p className="text-gray-500 mb-4">Bitte gib zuerst deine Ziele ein.</p>
          <Button onClick={() => router.push('/onboarding')}>Zu den Zielen →</Button>
        </div>
      </div>
    )
  }

  const isOutdated = localRoadmap && profile
    ? localRoadmap.profileHash !== profileHash(profile)
    : false

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-3xl mx-auto">
        <button
          type="button"
          onClick={() => router.push('/goals')}
          className="text-sm text-gray-400 hover:text-gray-700"
        >
          ← Meine Ziele
        </button>
        <Button
          variant="outline"
          size="sm"
          onClick={generate}
          disabled={status === 'generating'}
        >
          {status === 'generating' ? '⟳ Wird generiert...' : '↺ Neu generieren'}
        </Button>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Deine Roadmap</h1>
          <p className="text-sm text-gray-500">
            {localRoadmap
              ? `Erstellt am ${new Date(localRoadmap.generatedAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}`
              : 'KI-generierter Fahrplan für deine Ziele'
            }
          </p>
        </div>

        {/* Outdated banner */}
        {isOutdated && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertDescription className="text-amber-700 text-sm flex items-center justify-between flex-wrap gap-2">
              <span>⚠️ Deine Ziele haben sich seit der letzten Generierung geändert.</span>
              <Button size="sm" variant="outline" onClick={generate} className="border-amber-300 text-amber-700">
                Roadmap aktualisieren
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Error state */}
        {status === 'error' && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={generate}>
                Erneut versuchen
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Generating state */}
        {status === 'generating' && (
          <div className="border border-gray-200 rounded-xl p-8 text-center space-y-4">
            <div className="text-3xl animate-pulse">🗺️</div>
            <p className="text-sm font-medium text-gray-700">{progressMsg}</p>
            <Progress value={progress} className="max-w-xs mx-auto" />
            <p className="text-xs text-gray-400">Claude analysiert deine Ziele und erstellt deinen Fahrplan...</p>
          </div>
        )}

        {/* Roadmap content */}
        {(status === 'done' || (status === 'idle' && localRoadmap)) && localRoadmap && (
          <Tabs defaultValue={localRoadmap.lifeAreaRoadmaps[0]?.lifeAreaId ?? 'all'}>
            <TabsList className="flex flex-wrap h-auto gap-1 bg-gray-100 p-1 mb-4">
              {localRoadmap.lifeAreaRoadmaps.map(lar => {
                const area = profile.lifeAreas.find(a => a.id === lar.lifeAreaId)
                const colorMap = area ? LIFE_AREA_COLOR_MAP[area.color] : LIFE_AREA_COLOR_MAP.blue
                return (
                  <TabsTrigger
                    key={lar.lifeAreaId}
                    value={lar.lifeAreaId}
                    className={`text-xs sm:text-sm data-[state=active]:${colorMap.bg} data-[state=active]:${colorMap.text}`}
                  >
                    {area && <span className={`w-2 h-2 rounded-full mr-1.5 ${colorMap.dot}`} />}
                    {lar.lifeAreaName}
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {localRoadmap.lifeAreaRoadmaps.map(lar => {
              const area = profile.lifeAreas.find(a => a.id === lar.lifeAreaId)
              const color = area?.color ?? 'blue'
              return (
                <TabsContent key={lar.lifeAreaId} value={lar.lifeAreaId}>
                  <TimelineAccordion
                    lifeAreaRoadmap={lar}
                    color={color}
                    onUpdateItem={(section, subKey, item) =>
                      updateItem(lar.lifeAreaId, section, subKey, item)
                    }
                  />
                </TabsContent>
              )
            })}
          </Tabs>
        )}
      </main>
    </div>
  )
}
