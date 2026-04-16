'use client'

import { use, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { UserAuthButton } from '@/components/UserAuthButton'
import { CommentButton } from '@/components/coach/CommentButton'
import { CommentDialog } from '@/components/coach/CommentDialog'
import { TimelineAccordion } from '@/components/roadmap/TimelineAccordion'
import { WeekFocusView } from '@/components/roadmap/WeekFocusView'
import { YearPlanView } from '@/components/roadmap/YearPlanView'
import { useAuth } from '@/hooks/useAuth'
import { useCoachRole } from '@/hooks/useCoachRole'
import { useClientRoadmap } from '@/hooks/useClientRoadmap'
import { LIFE_AREA_COLOR_MAP, RoadmapItem } from '@/lib/types'

interface RouteParams {
  clientId: string
}

interface DbComment {
  id: string
  item_id: string
  client_id: string
}

export default function CoachClientPage({ params }: { params: Promise<RouteParams> }) {
  const { clientId } = use(params)
  const router = useRouter()

  const { user, isLoaded: authLoaded } = useAuth()
  const { isCoach, isLoaded: roleLoaded } = useCoachRole()
  const { roadmap, profile, isLoaded: roadmapLoaded, error } = useClientRoadmap(clientId)

  const [activeArea, setActiveArea] = useState<string>('__week__')
  const [commentItemId, setCommentItemId] = useState<string | null>(null)
  const [commentItemText, setCommentItemText] = useState<string | undefined>(undefined)
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})

  // Load comment counts per item for quick rendering (badge on CommentButton)
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user || !clientId) return
      const { data } = await supabase
        .from('roadmap_comments')
        .select('id, item_id, client_id')
        .eq('client_id', clientId)
        .limit(1000)
      if (cancelled) return
      const map: Record<string, number> = {}
      for (const c of (data ?? []) as DbComment[]) {
        map[c.item_id] = (map[c.item_id] ?? 0) + 1
      }
      setCommentCounts(map)
    }
    if (authLoaded && user) void load()
    return () => { cancelled = true }
    // reload after comment dialog closes (when commentItemId changes to null)
  }, [authLoaded, user, clientId, commentItemId])

  const areaColors = useMemo(() => {
    if (!profile) return {}
    return Object.fromEntries(profile.lifeAreas.map((a) => [a.id, a.color]))
  }, [profile])

  const isLoading = !authLoaded || !roleLoaded || (user && !roadmapLoaded)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="border-b border-gray-100 bg-white px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </nav>
        <main className="max-w-4xl mx-auto px-6 py-8 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-center px-6">
        <div>
          <p className="text-gray-500 mb-4">Bitte melde dich an.</p>
          <Button onClick={() => router.push('/auth?from=/coach')}>Zum Login →</Button>
        </div>
      </div>
    )
  }

  if (!isCoach) {
    return (
      <div className="min-h-screen bg-white">
        <nav className="border-b border-gray-100 bg-white px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
          <button
            type="button"
            onClick={() => router.push('/goals')}
            className="text-sm text-gray-400 hover:text-gray-700"
          >
            ← Meine Ziele
          </button>
          <UserAuthButton />
        </nav>
        <main className="max-w-3xl mx-auto px-6 py-16 text-center">
          <p className="text-sm text-gray-500">Kein Coach-Zugang.</p>
        </main>
      </div>
    )
  }

  const hasAnyArea = profile && profile.lifeAreas.length > 0
  const hasRoadmap = roadmap && roadmap.lifeAreaRoadmaps.length > 0

  // Client label — we only have the ID, show a truncated UUID as fallback.
  const clientLabel = clientId.slice(0, 8)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="border-b border-gray-100 bg-white px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => router.push('/coach')}
          className="text-sm text-gray-400 hover:text-gray-700"
        >
          ← Meine Klienten
        </button>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs border-indigo-200 text-indigo-700 bg-indigo-50">
            Read-only
          </Badge>
          <UserAuthButton />
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Klient-Roadmap</h1>
          <p className="text-sm text-gray-500">
            Du siehst die Roadmap nur lesend. Über die Sprechblasen kannst du Kommentare hinterlassen.
          </p>
          <p className="text-xs text-gray-400 mt-1">Klient-ID: {clientLabel}</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!hasAnyArea && !hasRoadmap && (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center">
            <div className="text-3xl mb-3">🔍</div>
            <p className="text-sm font-medium text-gray-700">Keine Daten sichtbar.</p>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
              Entweder hat der Klient noch keine Roadmap erstellt oder alle Lebensbereiche sind für dich gesperrt.
            </p>
          </div>
        )}

        {hasRoadmap && (
          <Tabs value={activeArea} onValueChange={setActiveArea}>
            <TabsList className="flex flex-wrap h-auto gap-1 bg-gray-100 p-1 mb-4">
              <TabsTrigger
                value="__week__"
                className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                📅 Diese Woche
              </TabsTrigger>
              <TabsTrigger
                value="__year__"
                className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                📆 Jahresplan
              </TabsTrigger>
              {roadmap!.lifeAreaRoadmaps.map((lar) => {
                const color = areaColors[lar.lifeAreaId] ?? 'blue'
                const colorMap =
                  LIFE_AREA_COLOR_MAP[color as keyof typeof LIFE_AREA_COLOR_MAP] ??
                  LIFE_AREA_COLOR_MAP.blue
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

            <TabsContent value="__week__">
              <WeekFocusView
                lifeAreaRoadmaps={roadmap!.lifeAreaRoadmaps}
                areaColors={areaColors}
                completed={new Set<string>()}
                onToggleComplete={() => undefined}
                onUpdateItem={() => undefined}
                readOnly
                renderCommentSlot={(item: RoadmapItem) => (
                  <CommentButton
                    hasComment={(commentCounts[item.id] ?? 0) > 0}
                    count={commentCounts[item.id] ?? 0}
                    onClick={() => {
                      setCommentItemId(item.id)
                      setCommentItemText(item.text)
                    }}
                  />
                )}
              />
            </TabsContent>

            <TabsContent value="__year__">
              <YearPlanView
                lifeAreaRoadmaps={roadmap!.lifeAreaRoadmaps}
                areaColors={areaColors}
                completed={new Set<string>()}
                onToggleComplete={() => undefined}
                onUpdateItem={() => undefined}
                readOnly
                renderCommentSlot={(item: RoadmapItem) => (
                  <CommentButton
                    hasComment={(commentCounts[item.id] ?? 0) > 0}
                    count={commentCounts[item.id] ?? 0}
                    onClick={() => {
                      setCommentItemId(item.id)
                      setCommentItemText(item.text)
                    }}
                  />
                )}
              />
            </TabsContent>

            {roadmap!.lifeAreaRoadmaps.map((lar) => (
              <TabsContent key={lar.lifeAreaId} value={lar.lifeAreaId}>
                <TimelineAccordion
                  lifeAreaRoadmap={lar}
                  color={areaColors[lar.lifeAreaId] ?? 'blue'}
                  completed={new Set<string>()}
                  onToggleComplete={() => undefined}
                  onUpdateItem={() => undefined}
                  readOnly
                  renderCommentSlot={(item: RoadmapItem) => (
                    <CommentButton
                      hasComment={(commentCounts[item.id] ?? 0) > 0}
                      count={commentCounts[item.id] ?? 0}
                      onClick={() => {
                        setCommentItemId(item.id)
                        setCommentItemText(item.text)
                      }}
                    />
                  )}
                />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </main>

      {/* Comment dialog */}
      <CommentDialog
        open={!!commentItemId}
        onClose={() => {
          setCommentItemId(null)
          setCommentItemText(undefined)
        }}
        itemId={commentItemId}
        clientId={clientId}
        canEdit
        itemText={commentItemText}
      />
    </div>
  )
}
