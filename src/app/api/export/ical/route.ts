import { NextRequest } from 'next/server'
import ical, { ICalCalendarMethod } from 'ical-generator'
import { Roadmap } from '@/lib/types'

export const dynamic = 'force-dynamic'

const MONTH_KEYS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'] as const
const MONTH_NUMS: Record<string, number> = {
  jan:0, feb:1, mar:2, apr:3, may:4, jun:5,
  jul:6, aug:7, sep:8, oct:9, nov:10, dec:11,
}
const QUARTER_START_MONTH: Record<string, number> = { q1:0, q2:3, q3:6, q4:9 }

function stripFormatting(text: string): string {
  return text
    .replace(/→\s*Erster Schritt:\s*/g, '\nErster Schritt: ')
    .replace(/→\s*Reflexionsfrage:\s*/g, '\nReflexionsfrage: ')
    .trim()
}

function shortTitle(text: string): string {
  const goal = text.replace(/→[\s\S]*$/, '').trim()
  return goal.length > 75 ? goal.slice(0, 72) + '…' : goal
}

export async function POST(req: NextRequest) {
  let roadmap: Roadmap
  let levels: string[]
  let areaIds: string[]
  let year: number

  try {
    const body = await req.json() as { roadmap: Roadmap; levels: string[]; areaIds: string[]; year?: number }
    roadmap = body.roadmap
    levels = body.levels ?? ['weeks', 'months', 'quarters']
    areaIds = body.areaIds ?? roadmap.lifeAreaRoadmaps.map(l => l.lifeAreaId)
    year = body.year ?? new Date().getFullYear()
  } catch {
    return new Response('Ungültige Anfrage.', { status: 400 })
  }

  const cal = ical({
    name: 'Ziele Roadmap',
    method: ICalCalendarMethod.PUBLISH,
    prodId: { company: 'ZieleApp', product: 'Roadmap' },
  })

  const selectedAreas = roadmap.lifeAreaRoadmaps.filter(l => areaIds.includes(l.lifeAreaId))
  let totalEvents = 0

  for (const lar of selectedAreas) {
    const tl = lar.timeline

    // Wochenziele → Montag der jeweiligen Woche (ab heute)
    if (levels.includes('weeks')) {
      const now = new Date()
      const dayOfWeek = now.getDay() // 0=Sun
      const monday = new Date(now)
      monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))

      ;(['w1','w2','w3','w4'] as const).forEach((wk, i) => {
        const items = tl.weeks[wk]
        if (!items?.length) return
        const date = new Date(monday)
        date.setDate(monday.getDate() + i * 7)

        items.forEach(item => {
          if (totalEvents >= 100) return
          cal.createEvent({
            start: date,
            allDay: true,
            summary: `[${lar.lifeAreaName}] ${shortTitle(item.text)}`,
            description: stripFormatting(item.text),
          })
          totalEvents++
        })
      })
    }

    // Monatsziele → 1. des jeweiligen Monats
    if (levels.includes('months')) {
      MONTH_KEYS.forEach(month => {
        const items = tl.months[month]
        if (!items?.length) return
        const date = new Date(Date.UTC(year, MONTH_NUMS[month], 1))

        items.forEach(item => {
          if (totalEvents >= 100) return
          cal.createEvent({
            start: date,
            allDay: true,
            summary: `[${lar.lifeAreaName}] ${shortTitle(item.text)}`,
            description: stripFormatting(item.text),
          })
          totalEvents++
        })
      })
    }

    // Quartalsziele → 1. des jeweiligen Quartals
    if (levels.includes('quarters')) {
      ;(['q1','q2','q3','q4'] as const).forEach(q => {
        const items = tl.quarters[q]
        if (!items?.length) return
        const date = new Date(Date.UTC(year, QUARTER_START_MONTH[q], 1))

        items.forEach(item => {
          if (totalEvents >= 100) return
          cal.createEvent({
            start: date,
            allDay: true,
            summary: `[${lar.lifeAreaName}] ${shortTitle(item.text)}`,
            description: stripFormatting(item.text),
          })
          totalEvents++
        })
      })
    }

    // Jahresziele → 1. Januar
    if (levels.includes('goals1y')) {
      tl.goals1y.forEach(item => {
        if (totalEvents >= 100) return
        cal.createEvent({
          start: new Date(year, 0, 1),
          allDay: true,
          summary: `[${lar.lifeAreaName}] ${shortTitle(item.text)}`,
          description: stripFormatting(item.text),
        })
        totalEvents++
      })
    }
  }

  return new Response(cal.toString(), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="ziele-roadmap.ics"',
      'Cache-Control': 'no-store',
    },
  })
}
