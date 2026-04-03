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
  onUpdateItem: (section: string, subKey: string | null, item: RoadmapItem) => void
}

const MONTH_LABELS: Record<string, string> = {
  jan: 'Januar', feb: 'Februar', mar: 'März', apr: 'April',
  may: 'Mai', jun: 'Juni', jul: 'Juli', aug: 'August',
  sep: 'September', oct: 'Oktober', nov: 'November', dec: 'Dezember',
}

const QUARTER_LABELS: Record<string, string> = {
  q1: 'Q1 (Jan–Mär)', q2: 'Q2 (Apr–Jun)', q3: 'Q3 (Jul–Sep)', q4: 'Q4 (Okt–Dez)',
}

function ItemList({
  items,
  section,
  subKey,
  onUpdate,
}: {
  items: RoadmapItem[]
  section: string
  subKey: string | null
  onUpdate: (item: RoadmapItem) => void
}) {
  if (!items?.length) return <p className="text-xs text-gray-400 italic">Keine Einträge</p>
  return (
    <div className="space-y-3">
      {items.map(item => (
        <RoadmapItemCard key={item.id} item={item} onSave={onUpdate} />
      ))}
    </div>
  )
}

export function TimelineAccordion({ lifeAreaRoadmap, color, onUpdateItem }: Props) {
  const tl = lifeAreaRoadmap.timeline
  const colorMap = LIFE_AREA_COLOR_MAP[color as keyof typeof LIFE_AREA_COLOR_MAP] ?? LIFE_AREA_COLOR_MAP.blue

  const sectionHeader = (label: string, items: RoadmapItem[]) => (
    <span className="flex items-center gap-2 text-sm font-medium">
      {label}
      {items?.length > 0 && (
        <Badge variant="secondary" className="text-xs font-normal">{items.length}</Badge>
      )}
    </span>
  )

  return (
    <Accordion type="multiple" defaultValue={['vision5y', 'goals1y', 'w1']} className="space-y-1">
      {/* 5-Jahres-Vision */}
      <AccordionItem value="vision5y" className={`border ${colorMap.border} rounded-lg overflow-hidden`}>
        <AccordionTrigger className={`px-4 py-3 ${colorMap.bg} hover:no-underline`}>
          {sectionHeader('5-Jahres-Vision', tl.vision5y)}
        </AccordionTrigger>
        <AccordionContent className="px-4 py-3 bg-white">
          <ItemList items={tl.vision5y} section="vision5y" subKey={null}
            onUpdate={item => onUpdateItem('vision5y', null, item)} />
        </AccordionContent>
      </AccordionItem>

      {/* 3-Jahresziele */}
      <AccordionItem value="goals3y" className="border border-gray-200 rounded-lg overflow-hidden">
        <AccordionTrigger className="px-4 py-3 bg-gray-50 hover:no-underline">
          {sectionHeader('3-Jahresziele', tl.goals3y)}
        </AccordionTrigger>
        <AccordionContent className="px-4 py-3 bg-white">
          <ItemList items={tl.goals3y} section="goals3y" subKey={null}
            onUpdate={item => onUpdateItem('goals3y', null, item)} />
        </AccordionContent>
      </AccordionItem>

      {/* Jahresziele */}
      <AccordionItem value="goals1y" className="border border-gray-200 rounded-lg overflow-hidden">
        <AccordionTrigger className="px-4 py-3 bg-gray-50 hover:no-underline">
          {sectionHeader('Jahresziele', tl.goals1y)}
        </AccordionTrigger>
        <AccordionContent className="px-4 py-3 bg-white">
          <ItemList items={tl.goals1y} section="goals1y" subKey={null}
            onUpdate={item => onUpdateItem('goals1y', null, item)} />
        </AccordionContent>
      </AccordionItem>

      {/* Quartalsziele */}
      <AccordionItem value="quarters" className="border border-gray-200 rounded-lg overflow-hidden">
        <AccordionTrigger className="px-4 py-3 bg-gray-50 hover:no-underline">
          <span className="text-sm font-medium">Quartalsziele</span>
        </AccordionTrigger>
        <AccordionContent className="px-4 py-3 bg-white space-y-4">
          {(['q1', 'q2', 'q3', 'q4'] as const).map(q => (
            <div key={q}>
              <p className="text-xs font-medium text-gray-500 mb-2">{QUARTER_LABELS[q]}</p>
              <ItemList items={tl.quarters[q]} section="quarters" subKey={q}
                onUpdate={item => onUpdateItem('quarters', q, item)} />
            </div>
          ))}
        </AccordionContent>
      </AccordionItem>

      {/* Monatsziele */}
      <AccordionItem value="months" className="border border-gray-200 rounded-lg overflow-hidden">
        <AccordionTrigger className="px-4 py-3 bg-gray-50 hover:no-underline">
          <span className="text-sm font-medium">Monatsziele (Jan–Dez)</span>
        </AccordionTrigger>
        <AccordionContent className="px-4 py-3 bg-white space-y-4">
          {(Object.keys(MONTH_LABELS) as Array<keyof typeof tl.months>).map(month => (
            <div key={month}>
              <p className="text-xs font-medium text-gray-500 mb-2">{MONTH_LABELS[month]}</p>
              <ItemList items={tl.months[month]} section="months" subKey={month}
                onUpdate={item => onUpdateItem('months', month, item)} />
            </div>
          ))}
        </AccordionContent>
      </AccordionItem>

      {/* Wochenziele */}
      <AccordionItem value="weeks" className="border border-gray-200 rounded-lg overflow-hidden">
        <AccordionTrigger className="px-4 py-3 bg-gray-50 hover:no-underline">
          <span className="text-sm font-medium">Wochenziele (erste 4 Wochen)</span>
        </AccordionTrigger>
        <AccordionContent className="px-4 py-3 bg-white space-y-4">
          {(['w1', 'w2', 'w3', 'w4'] as const).map((w, i) => (
            <div key={w}>
              <p className="text-xs font-medium text-gray-500 mb-2">Woche {i + 1}</p>
              <ItemList items={tl.weeks[w]} section="weeks" subKey={w}
                onUpdate={item => onUpdateItem('weeks', w, item)} />
            </div>
          ))}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
