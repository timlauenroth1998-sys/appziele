'use client'

import { ReactNode } from 'react'
import { RoadmapItemCard } from './RoadmapItemCard'
import { LifeAreaRoadmap, LifeAreaColor, RoadmapItem, LIFE_AREA_COLOR_MAP } from '@/lib/types'

interface Props {
  lifeAreaRoadmaps: LifeAreaRoadmap[]
  areaColors: Record<string, string>
  completed: Set<string>
  onToggleComplete: (id: string) => void
  onUpdateItem: (lifeAreaId: string, section: string, subKey: string | null, item: RoadmapItem) => void
  readOnly?: boolean
  renderCommentSlot?: (item: RoadmapItem) => ReactNode
}

const WEEK_LABELS = ['Woche 1', 'Woche 2', 'Woche 3', 'Woche 4']
const WEEK_KEYS = ['w1', 'w2', 'w3', 'w4'] as const

export function WeekFocusView({
  lifeAreaRoadmaps,
  areaColors,
  completed,
  onToggleComplete,
  onUpdateItem,
  readOnly = false,
  renderCommentSlot,
}: Props) {
  // Collect all week items across all life areas
  type ColorMap = typeof LIFE_AREA_COLOR_MAP[LifeAreaColor]
  const allWeekItems: { item: RoadmapItem; weekLabel: string; areaId: string; areaName: string; colorMap: ColorMap }[] = []

  lifeAreaRoadmaps.forEach(lar => {
    const color = areaColors[lar.lifeAreaId] ?? 'blue'
    const colorMap = LIFE_AREA_COLOR_MAP[(color as LifeAreaColor)] ?? LIFE_AREA_COLOR_MAP['blue']
    WEEK_KEYS.forEach((wk, i) => {
      lar.timeline.weeks[wk].forEach(item => {
        allWeekItems.push({ item, weekLabel: WEEK_LABELS[i], areaId: lar.lifeAreaId, areaName: lar.lifeAreaName, colorMap })
      })
    })
  })

  const done = allWeekItems.filter(x => completed.has(x.item.id)).length
  const total = allWeekItems.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  if (total === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-sm">Keine Wochenziele vorhanden.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Week progress summary */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">Wochenfortschritt</span>
          <span className="text-sm font-bold text-gray-900">{done} / {total} erledigt</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="h-2 rounded-full bg-green-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{pct}% dieser Woche abgeschlossen</p>
      </div>

      {/* Items grouped by week */}
      {WEEK_KEYS.map((wk, i) => {
        const weekItems = allWeekItems.filter(x => x.weekLabel === WEEK_LABELS[i])
        if (!weekItems.length) return null
        return (
          <div key={wk}>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{WEEK_LABELS[i]}</h3>
            <div className="space-y-3">
              {weekItems.map(({ item, areaId, areaName, colorMap }) => (
                <div key={item.id}>
                  <div className={`inline-flex items-center gap-1.5 mb-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${colorMap.bg} ${colorMap.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${colorMap.dot}`} />
                    {areaName}
                  </div>
                  <RoadmapItemCard
                    item={item}
                    completed={completed.has(item.id)}
                    onToggleComplete={readOnly ? undefined : onToggleComplete}
                    onSave={updated => onUpdateItem(areaId, 'weeks', wk, updated)}
                    readOnly={readOnly}
                    commentSlot={renderCommentSlot ? renderCommentSlot(item) : undefined}
                  />
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
