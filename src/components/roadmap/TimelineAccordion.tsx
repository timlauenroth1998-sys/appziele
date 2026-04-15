'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { RoadmapItemCard } from './RoadmapItemCard'
import { LifeAreaRoadmap, RoadmapItem, LIFE_AREA_COLOR_MAP } from '@/lib/types'

interface Props {
  lifeAreaRoadmap: LifeAreaRoadmap
  color: string
  completed: Set<string>
  onToggleComplete: (id: string) => void
  onUpdateItem: (section: string, subKey: string | null, item: RoadmapItem) => void
}

const MONTH_LABELS: Record<string, string> = {
  jan: 'Januar', feb: 'Februar', mar: 'März', apr: 'April',
  may: 'Mai', jun: 'Juni', jul: 'Juli', aug: 'August',
  sep: 'September', oct: 'Oktober', nov: 'November', dec: 'Dezember',
}

const MONTH_KEYS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'] as const

const QUARTER_LABELS: Record<string, string> = {
  q1: 'Q1 (Jan–Mär)', q2: 'Q2 (Apr–Jun)', q3: 'Q3 (Jul–Sep)', q4: 'Q4 (Okt–Dez)',
}

function getCurrentSections(): string[] {
  const month = new Date().getMonth() // 0-indexed
  const monthKey = MONTH_KEYS[month]
  const quarterKey = ['q1','q1','q1','q2','q2','q2','q3','q3','q3','q4','q4','q4'][month]
  return ['vision5y', 'goals1y', monthKey, quarterKey, 'w1']
}

function ProgressPill({ done, total }: { done: number; total: number }) {
  if (!total) return null
  const pct = Math.round((done / total) * 100)
  return (
    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-medium ${
      pct === 100 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
    }`}>
      {done}/{total}
    </span>
  )
}

function ItemList({
  items, completed, onToggleComplete, onUpdate,
}: {
  items: RoadmapItem[]
  completed: Set<string>
  onToggleComplete: (id: string) => void
  onUpdate: (item: RoadmapItem) => void
}) {
  if (!items?.length) return <p className="text-xs text-gray-400 italic">Keine Einträge</p>
  return (
    <div className="space-y-3">
      {items.map(item => (
        <RoadmapItemCard
          key={item.id}
          item={item}
          completed={completed.has(item.id)}
          onToggleComplete={onToggleComplete}
          onSave={onUpdate}
        />
      ))}
    </div>
  )
}

export function TimelineAccordion({ lifeAreaRoadmap, color, completed, onToggleComplete, onUpdateItem }: Props) {
  const tl = lifeAreaRoadmap.timeline
  const colorMap = LIFE_AREA_COLOR_MAP[color as keyof typeof LIFE_AREA_COLOR_MAP] ?? LIFE_AREA_COLOR_MAP.blue
  const defaultOpen = getCurrentSections()

  const sectionHeader = (label: string, items: RoadmapItem[]) => {
    const done = items.filter(i => completed.has(i.id)).length
    return (
      <span className="flex items-center gap-1 text-sm font-medium">
        {label}
        {items?.length > 0 && <Badge variant="secondary" className="text-xs font-normal">{items.length}</Badge>}
        <ProgressPill done={done} total={items.length} />
      </span>
    )
  }

  return (
    <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-1">
      {/* 5-Jahres-Vision */}
      <AccordionItem value="vision5y" className={`border ${colorMap.border} rounded-lg overflow-hidden`}>
        <AccordionTrigger className={`px-4 py-3 ${colorMap.bg} hover:no-underline`}>
          {sectionHeader('5-Jahres-Vision', tl.vision5y)}
        </AccordionTrigger>
        <AccordionContent className="px-4 py-3 bg-white">
          <ItemList items={tl.vision5y} completed={completed} onToggleComplete={onToggleComplete}
            onUpdate={item => onUpdateItem('vision5y', null, item)} />
        </AccordionContent>
      </AccordionItem>

      {/* 3-Jahresziele */}
      <AccordionItem value="goals3y" className="border border-gray-200 rounded-lg overflow-hidden">
        <AccordionTrigger className="px-4 py-3 bg-gray-50 hover:no-underline">
          {sectionHeader('3-Jahresziele', tl.goals3y)}
        </AccordionTrigger>
        <AccordionContent className="px-4 py-3 bg-white">
          <ItemList items={tl.goals3y}completed={completed} onToggleComplete={onToggleComplete}
            onUpdate={item => onUpdateItem('goals3y', null, item)} />
        </AccordionContent>
      </AccordionItem>

      {/* Jahresziele */}
      <AccordionItem value="goals1y" className="border border-gray-200 rounded-lg overflow-hidden">
        <AccordionTrigger className="px-4 py-3 bg-gray-50 hover:no-underline">
          {sectionHeader('Jahresziele', tl.goals1y)}
        </AccordionTrigger>
        <AccordionContent className="px-4 py-3 bg-white">
          <ItemList items={tl.goals1y}completed={completed} onToggleComplete={onToggleComplete}
            onUpdate={item => onUpdateItem('goals1y', null, item)} />
        </AccordionContent>
      </AccordionItem>

      {/* Quartalsziele — aktuelles Quartal hervorgehoben */}
      {(['q1','q2','q3','q4'] as const).map(q => {
        const isCurrent = defaultOpen.includes(q)
        return (
          <AccordionItem key={q} value={q} className={`border rounded-lg overflow-hidden ${isCurrent ? `${colorMap.border}` : 'border-gray-200'}`}>
            <AccordionTrigger className={`px-4 py-3 hover:no-underline ${isCurrent ? colorMap.bg : 'bg-gray-50'}`}>
              <span className="flex items-center gap-2">
                {sectionHeader(QUARTER_LABELS[q], tl.quarters[q])}
                {isCurrent && <Badge className="text-xs bg-blue-600 text-white">Aktuell</Badge>}
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 py-3 bg-white">
              <ItemList items={tl.quarters[q]}completed={completed} onToggleComplete={onToggleComplete}
                onUpdate={item => onUpdateItem('quarters', q, item)} />
            </AccordionContent>
          </AccordionItem>
        )
      })}

      {/* Monatsziele — aktuellen Monat hervorheben */}
      {MONTH_KEYS.map(month => {
        const isCurrent = defaultOpen.includes(month)
        return (
          <AccordionItem key={month} value={month} className={`border rounded-lg overflow-hidden ${isCurrent ? colorMap.border : 'border-gray-200'}`}>
            <AccordionTrigger className={`px-4 py-3 hover:no-underline ${isCurrent ? colorMap.bg : 'bg-gray-50'}`}>
              <span className="flex items-center gap-2">
                {sectionHeader(MONTH_LABELS[month], tl.months[month])}
                {isCurrent && <Badge className="text-xs bg-blue-600 text-white">Aktuell</Badge>}
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 py-3 bg-white">
              <ItemList items={tl.months[month]}completed={completed} onToggleComplete={onToggleComplete}
                onUpdate={item => onUpdateItem('months', month, item)} />
            </AccordionContent>
          </AccordionItem>
        )
      })}

      {/* Wochenziele */}
      {(['w1','w2','w3','w4'] as const).map((w, i) => (
        <AccordionItem key={w} value={w} className="border border-gray-200 rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 bg-gray-50 hover:no-underline">
            {sectionHeader(`Woche ${i + 1}`, tl.weeks[w])}
          </AccordionTrigger>
          <AccordionContent className="px-4 py-3 bg-white">
            <ItemList items={tl.weeks[w]}completed={completed} onToggleComplete={onToggleComplete}
              onUpdate={item => onUpdateItem('weeks', w, item)} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
