'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useGoalStorage } from '@/hooks/useGoalStorage'
import { useRoadmapStorage } from '@/hooks/useRoadmapStorage'
import { useCompletions } from '@/hooks/useCompletions'
import { TimelineAccordion } from '@/components/roadmap/TimelineAccordion'
import { WeekFocusView } from '@/components/roadmap/WeekFocusView'
import { Roadmap, LifeAreaRoadmap, RoadmapItem, LIFE_AREA_COLOR_MAP } from '@/lib/types'

type Status = 'idle' | 'generating' | 'done' | 'error'

function profileHash(profile: { lifeAreas: unknown[] }): string {
  try { return btoa(JSON.stringify(profile.lifeAreas)).slice(0, 16) } catch { return '' }
}

function getAllItems(roadmap: Roadmap) {
  return roadmap.lifeAreaRoadmaps.flatMap(lar => {
    const tl = lar.timeline
    return [
      ...tl.vision5y, ...tl.goals3y, ...tl.goals1y,
      ...Object.values(tl.quarters).flat(),
      ...Object.values(tl.months).flat(),
      ...Object.values(tl.weeks).flat(),
    ]
  })
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
  const { completed, toggle, getProgress, isLoaded: completionsLoaded } = useCompletions()

  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState(GENERATING_MESSAGES[0])
  const [localRoadmap, setLocalRoadmap] = useState<Roadmap | null>(null)
  const [activeArea, setActiveArea] = useState<string>('__week__')

  useEffect(() => {
    if (roadmapLoaded && roadmap) setLocalRoadmap(roadmap)
  }, [roadmapLoaded, roadmap])

  useEffect(() => {
    if (profileLoaded && roadmapLoaded && !roadmap && profile && status === 'idle') generate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLoaded, roadmapLoaded])

  const generate = useCallback(async () => {
    if (!profile) return
    setStatus('generating')
    setError('')
    setProgress(5)
    setProgressMsg(GENERATING_MESSAGES[0])

    const collectedAreas: LifeAreaRoadmap[] = []
    const total = profile.lifeAreas.length

    try {
      const res = await fetch('/api/roadmap/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Unbekannter Fehler')
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          const msg = JSON.parse(line) as { type: string; data?: LifeAreaRoadmap; profileHash?: string; message?: string }

          if (msg.type === 'area' && msg.data) {
            collectedAreas.push(msg.data)
            setProgress(5 + Math.round((collectedAreas.length / total) * 90))
            setProgressMsg(`${collectedAreas.length} von ${total} Lebensbereichen fertig...`)
            setLocalRoadmap({ generatedAt: new Date().toISOString(), profileHash: '', lifeAreaRoadmaps: [...collectedAreas] })
          } else if (msg.type === 'done') {
            const final: Roadmap = { generatedAt: new Date().toISOString(), profileHash: msg.profileHash ?? profileHash(profile), lifeAreaRoadmaps: collectedAreas }
            setProgress(100)
            saveRoadmap(final)
            setLocalRoadmap(final)
            setStatus('done')
          } else if (msg.type === 'error') {
            throw new Error(msg.message)
          }
        }
      }

      if (collectedAreas.length > 0 && status !== 'done') {
        const final: Roadmap = { generatedAt: new Date().toISOString(), profileHash: profileHash(profile), lifeAreaRoadmaps: collectedAreas }
        saveRoadmap(final)
        setLocalRoadmap(final)
        setStatus('done')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generierung fehlgeschlagen.')
      setStatus('error')
    }
  }, [profile, saveRoadmap])

  const updateItem = useCallback((lifeAreaId: string, section: string, subKey: string | null, updatedItem: RoadmapItem) => {
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

  if (!profileLoaded || !roadmapLoaded || !completionsLoaded) {
    return (
      <div className="min-h-screen bg-white max-w-3xl mx-auto px-6 pt-16 space-y-4">
        <Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" />
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

  const isOutdated = localRoadmap && profile ? localRoadmap.profileHash !== profileHash(profile) : false
  const areaColors = Object.fromEntries(profile.lifeAreas.map(a => [a.id, a.color]))
  const totalProgress = localRoadmap ? getProgress(getAllItems(localRoadmap)) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="border-b border-gray-100 bg-white px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <button type="button" onClick={() => router.push('/goals')} className="text-sm text-gray-400 hover:text-gray-700">
          ← Meine Ziele
        </button>
        <div className="flex items-center gap-3">
          {localRoadmap && (
            <span className="text-xs text-gray-400 hidden sm:block">
              {totalProgress}% abgeschlossen
            </span>
          )}
          <Button variant="outline" size="sm" onClick={generate} disabled={status === 'generating'}>
            {status === 'generating' ? '⟳ Wird generiert...' : '↺ Neu generieren'}
          </Button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Deine Roadmap</h1>
          <p className="text-sm text-gray-500">
            {localRoadmap
              ? `Erstellt am ${new Date(localRoadmap.generatedAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}`
              : 'KI-generierter Fahrplan für deine Ziele'}
          </p>
        </div>

        {/* Overall progress bar */}
        {localRoadmap && (
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Gesamtfortschritt</span>
              <span className="text-sm font-bold text-gray-900">{totalProgress}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div className="h-2.5 rounded-full bg-green-500 transition-all duration-300" style={{ width: `${totalProgress}%` }} />
            </div>
            {/* Per-area progress */}
            <div className="mt-3 flex flex-wrap gap-2">
              {localRoadmap.lifeAreaRoadmaps.map(lar => {
                const color = areaColors[lar.lifeAreaId] ?? 'blue'
                const colorMap = LIFE_AREA_COLOR_MAP[color as keyof typeof LIFE_AREA_COLOR_MAP] ?? LIFE_AREA_COLOR_MAP.blue
                const allItems = [
                  ...lar.timeline.vision5y, ...lar.timeline.goals3y, ...lar.timeline.goals1y,
                  ...Object.values(lar.timeline.quarters).flat(),
                  ...Object.values(lar.timeline.months).flat(),
                  ...Object.values(lar.timeline.weeks).flat(),
                ]
                const pct = getProgress(allItems)
                return (
                  <div key={lar.lifeAreaId} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${colorMap.bg} ${colorMap.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${colorMap.dot}`} />
                    {lar.lifeAreaName}
                    <span className="font-semibold">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

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

        {status === 'error' && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={generate}>Erneut versuchen</Button>
            </AlertDescription>
          </Alert>
        )}

        {status === 'generating' && (
          <div className="border border-gray-200 rounded-xl bg-white p-8 text-center space-y-4">
            <div className="text-3xl animate-pulse">🗺️</div>
            <p className="text-sm font-medium text-gray-700">{progressMsg}</p>
            <div className="w-full bg-gray-100 rounded-full h-2 max-w-xs mx-auto">
              <div className="h-2 rounded-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            {(localRoadmap?.lifeAreaRoadmaps.length ?? 0) > 0 && (
              <p className="text-xs text-gray-400">{localRoadmap!.lifeAreaRoadmaps.length} Bereiche bereits verfügbar ↓</p>
            )}
          </div>
        )}

        {/* Roadmap content */}
        {localRoadmap && localRoadmap.lifeAreaRoadmaps.length > 0 && (
          <Tabs value={activeArea} onValueChange={setActiveArea}>
            <TabsList className="flex flex-wrap h-auto gap-1 bg-gray-100 p-1 mb-4">
              {/* "Diese Woche" tab */}
              <TabsTrigger value="__week__" className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                📅 Diese Woche
              </TabsTrigger>
              {/* Per-area tabs */}
              {localRoadmap.lifeAreaRoadmaps.map(lar => {
                const color = areaColors[lar.lifeAreaId] ?? 'blue'
                const colorMap = LIFE_AREA_COLOR_MAP[color as keyof typeof LIFE_AREA_COLOR_MAP] ?? LIFE_AREA_COLOR_MAP.blue
                return (
                  <TabsTrigger
                    key={lar.lifeAreaId}
                    value={lar.lifeAreaId}
                    className={`text-xs sm:text-sm data-[state=active]:${colorMap.bg} data-[state=active]:${colorMap.text}`}
                  >
                    <span className={`w-2 h-2 rounded-full mr-1.5 ${colorMap.dot}`} />
                    {lar.lifeAreaName}
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {/* Diese Woche */}
            <TabsContent value="__week__">
              <WeekFocusView
                lifeAreaRoadmaps={localRoadmap.lifeAreaRoadmaps}
                areaColors={areaColors}
                completed={completed}
                onToggleComplete={toggle}
                onUpdateItem={(areaId, section, subKey, item) => updateItem(areaId, section, subKey, item)}
              />
            </TabsContent>

            {/* Per-area timeline */}
            {localRoadmap.lifeAreaRoadmaps.map(lar => (
              <TabsContent key={lar.lifeAreaId} value={lar.lifeAreaId}>
                <TimelineAccordion
                  lifeAreaRoadmap={lar}
                  color={areaColors[lar.lifeAreaId] ?? 'blue'}
                  completed={completed}
                  onToggleComplete={toggle}
                  onUpdateItem={(section, subKey, item) => updateItem(lar.lifeAreaId, section, subKey, item)}
                />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </main>
    </div>
  )
}
