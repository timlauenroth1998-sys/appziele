'use client'

import { LifeAreaRoadmap, RoadmapItem, LifeAreaColor, LIFE_AREA_COLOR_MAP } from '@/lib/types'
import { RoadmapItemCard } from './RoadmapItemCard'
import { useState } from 'react'

interface Props {
  lifeAreaRoadmaps: LifeAreaRoadmap[]
  areaColors: Record<string, string>
  completed: Set<string>
  onToggleComplete: (id: string) => void
  onUpdateItem: (lifeAreaId: string, section: string, subKey: string | null, item: RoadmapItem) => void
}

const QUARTERS = [
  { key: 'q1', label: 'Q1', months: ['jan', 'feb', 'mar'] as const, range: 'Jan – Mär' },
  { key: 'q2', label: 'Q2', months: ['apr', 'may', 'jun'] as const, range: 'Apr – Jun' },
  { key: 'q3', label: 'Q3', months: ['jul', 'aug', 'sep'] as const, range: 'Jul – Sep' },
  { key: 'q4', label: 'Q4', months: ['oct', 'nov', 'dec'] as const, range: 'Okt – Dez' },
]

const MONTH_LABELS: Record<string, string> = {
  jan: 'Jan', feb: 'Feb', mar: 'Mär',
  apr: 'Apr', may: 'Mai', jun: 'Jun',
  jul: 'Jul', aug: 'Aug', sep: 'Sep',
  oct: 'Okt', nov: 'Nov', dec: 'Dez',
}

const currentMonth = new Date().getMonth()
const currentMonthKey = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'][currentMonth]
const currentQuarterKey = ['q1','q1','q1','q2','q2','q2','q3','q3','q3','q4','q4','q4'][currentMonth]

export function YearPlanView({ lifeAreaRoadmaps, areaColors, completed, onToggleComplete, onUpdateItem }: Props) {
  const [openCell, setOpenCell] = useState<string | null>(null) // "q1-jan-areaId"

  if (!lifeAreaRoadmaps.length) return null

  return (
    <div className="space-y-8">
      {/* Strategic strip: Vision → 3J → 1J */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { key: 'vision5y', label: '5-Jahres-Vision' },
          { key: 'goals3y',  label: '3-Jahresziele' },
          { key: 'goals1y',  label: 'Jahresziele' },
        ].map(({ key, label }) => (
          <div key={key} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
            <div className="space-y-1">
              {lifeAreaRoadmaps.map(lar => {
                const color = areaColors[lar.lifeAreaId] as LifeAreaColor ?? 'blue'
                const colorMap = LIFE_AREA_COLOR_MAP[color] ?? LIFE_AREA_COLOR_MAP.blue
                const items = lar.timeline[key as 'vision5y' | 'goals3y' | 'goals1y']
                if (!items?.length) return null
                const done = items.filter(i => completed.has(i.id)).length
                return (
                  <div key={lar.lifeAreaId} className={`px-2 py-1 rounded-lg ${colorMap.bg}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${colorMap.text}`}>{lar.lifeAreaName}</span>
                      <span className="text-xs text-gray-400">{done}/{items.length}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-2 leading-relaxed">
                      {items[0].text.replace(/→.*$/, '').trim()}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Quarterly grid */}
      {QUARTERS.map(({ key: qKey, label: qLabel, months, range }) => {
        const isCurrent = qKey === currentQuarterKey
        return (
          <div key={qKey} className={`rounded-xl border ${isCurrent ? 'border-blue-200' : 'border-gray-100'} overflow-hidden`}>
            {/* Quarter header */}
            <div className={`px-4 py-2 flex items-center gap-2 ${isCurrent ? 'bg-blue-50' : 'bg-gray-50'}`}>
              <span className={`text-sm font-bold ${isCurrent ? 'text-blue-700' : 'text-gray-600'}`}>{qLabel}</span>
              <span className="text-xs text-gray-400">{range}</span>
              {isCurrent && <span className="ml-auto text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Aktuell</span>}
            </div>

            {/* 3-column month grid */}
            <div className="grid grid-cols-3 divide-x divide-gray-100">
              {months.map(month => {
                const isCurMonth = month === currentMonthKey
                return (
                  <div key={month} className={`p-3 ${isCurMonth ? 'bg-blue-50/50' : 'bg-white'}`}>
                    <p className={`text-xs font-semibold mb-2 ${isCurMonth ? 'text-blue-700' : 'text-gray-500'}`}>
                      {MONTH_LABELS[month]}
                      {isCurMonth && <span className="ml-1 text-blue-400">●</span>}
                    </p>
                    <div className="space-y-2">
                      {lifeAreaRoadmaps.map(lar => {
                        const color = areaColors[lar.lifeAreaId] as LifeAreaColor ?? 'blue'
                        const colorMap = LIFE_AREA_COLOR_MAP[color] ?? LIFE_AREA_COLOR_MAP.blue
                        const items = lar.timeline.months[month]
                        if (!items?.length) return null
                        const cellKey = `${qKey}-${month}-${lar.lifeAreaId}`
                        const isOpen = openCell === cellKey
                        const done = items.filter(i => completed.has(i.id)).length

                        return (
                          <div key={lar.lifeAreaId}>
                            <button
                              type="button"
                              onClick={() => setOpenCell(isOpen ? null : cellKey)}
                              className={`w-full text-left px-2 py-1.5 rounded-lg transition-colors ${colorMap.bg} hover:opacity-80`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-xs font-medium ${colorMap.text} truncate`}>{lar.lifeAreaName}</span>
                                <span className={`text-xs ml-1 flex-shrink-0 ${done === items.length && items.length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                  {done}/{items.length} {isOpen ? '▲' : '▼'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 mt-0.5 line-clamp-2 leading-relaxed">
                                {items[0].text.replace(/→.*$/, '').trim()}
                              </p>
                            </button>

                            {/* Expanded detail */}
                            {isOpen && (
                              <div className="mt-2 space-y-2">
                                {items.map(item => (
                                  <RoadmapItemCard
                                    key={item.id}
                                    item={item}
                                    completed={completed.has(item.id)}
                                    onToggleComplete={onToggleComplete}
                                    onSave={updated => onUpdateItem(lar.lifeAreaId, 'months', month, updated)}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
