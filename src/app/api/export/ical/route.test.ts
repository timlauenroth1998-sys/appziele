import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { Roadmap, RoadmapTimeline } from '@/lib/types'

/** iCal lines are folded at 75 chars (CRLF + space). Unfold for easier assertions. */
function unfold(ical: string): string {
  return ical.replace(/\r\n[ \t]/g, '')
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers to build test data
// ─────────────────────────────────────────────────────────────────────────────

function makeItems(texts: string[]) {
  return texts.map((text, i) => ({ id: `item_${i}`, text, isEdited: false }))
}

function emptyTimeline(): RoadmapTimeline {
  return {
    vision5y: [],
    goals3y: [],
    goals1y: [],
    quarters: { q1: [], q2: [], q3: [], q4: [] },
    months: {
      jan: [], feb: [], mar: [], apr: [], may: [], jun: [],
      jul: [], aug: [], sep: [], oct: [], nov: [], dec: [],
    },
    weeks: { w1: [], w2: [], w3: [], w4: [] },
  }
}

function buildRoadmap(overrides?: Partial<{
  weeks: Partial<RoadmapTimeline['weeks']>
  months: Partial<RoadmapTimeline['months']>
  quarters: Partial<RoadmapTimeline['quarters']>
  goals1y: RoadmapTimeline['goals1y']
}>): Roadmap {
  const tl = emptyTimeline()
  if (overrides?.weeks) Object.assign(tl.weeks, overrides.weeks)
  if (overrides?.months) Object.assign(tl.months, overrides.months)
  if (overrides?.quarters) Object.assign(tl.quarters, overrides.quarters)
  if (overrides?.goals1y) tl.goals1y = overrides.goals1y
  return {
    generatedAt: '2026-01-01T00:00:00.000Z',
    profileHash: 'test',
    lifeAreaRoadmaps: [
      { lifeAreaId: 'career', lifeAreaName: 'Karriere', timeline: tl },
    ],
  }
}

async function callPOST(body: Record<string, unknown>) {
  // Dynamic import to avoid module-level issues
  const { POST } = await import('./route')
  const req = new NextRequest('http://localhost:3000/api/export/ical', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return POST(req)
}

// ─────────────────────────────────────────────────────────────────────────────
// Unit tests for stripFormatting
// ─────────────────────────────────────────────────────────────────────────────

describe('stripFormatting (tested via event description)', () => {
  it('strips arrow markers from text in event descriptions', async () => {
    const roadmap = buildRoadmap({
      goals1y: makeItems(['Ziel erreichen → Erster Schritt: Anfangen → Reflexionsfrage: Warum?']),
    })

    const res = await callPOST({ roadmap, levels: ['goals1y'], areaIds: ['career'], year: 2026 })
    const text = unfold(await res.text())

    // The description should have the arrows replaced with newlines
    expect(text).toContain('Erster Schritt: Anfangen')
    expect(text).toContain('Reflexionsfrage: Warum?')
    // Arrow markers should be stripped
    expect(text).not.toMatch(/→\s*Erster Schritt:/)
    expect(text).not.toMatch(/→\s*Reflexionsfrage:/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Unit tests for shortTitle
// ─────────────────────────────────────────────────────────────────────────────

describe('shortTitle (tested via event summary)', () => {
  it('truncates long titles at 75 chars with ellipsis', async () => {
    const longText = 'A'.repeat(80) + ' → Erster Schritt: foo'
    const roadmap = buildRoadmap({
      goals1y: makeItems([longText]),
    })

    const res = await callPOST({ roadmap, levels: ['goals1y'], areaIds: ['career'], year: 2026 })
    const text = unfold(await res.text())

    const lines = text.split('\n')
    const summaryLine = lines.find(l => l.startsWith('SUMMARY:'))
    expect(summaryLine).toBeDefined()
    expect(summaryLine).toContain('A'.repeat(72))
    expect(summaryLine).toContain('\u2026') // ellipsis character
  })

  it('does not truncate short titles', async () => {
    const shortText = 'Kurzes Ziel'
    const roadmap = buildRoadmap({
      goals1y: makeItems([shortText]),
    })

    const res = await callPOST({ roadmap, levels: ['goals1y'], areaIds: ['career'], year: 2026 })
    const text = unfold(await res.text())

    const lines = text.split('\n')
    const summaryLine = lines.find(l => l.startsWith('SUMMARY:'))
    expect(summaryLine).toContain('Kurzes Ziel')
    expect(summaryLine).not.toContain('\u2026')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Event count cap at 100
// ─────────────────────────────────────────────────────────────────────────────

describe('event count cap', () => {
  it('caps events at 100 even with more items available', async () => {
    // Create a roadmap with >100 items across months
    const months: Partial<RoadmapTimeline['months']> = {}
    const monthKeys = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'] as const
    for (const m of monthKeys) {
      // 10 items per month = 120 total
      months[m] = Array.from({ length: 10 }, (_, i) => ({
        id: `${m}_${i}`,
        text: `Aufgabe ${m} ${i}`,
        isEdited: false,
      }))
    }

    const roadmap = buildRoadmap({ months })
    const res = await callPOST({ roadmap, levels: ['months'], areaIds: ['career'], year: 2026 })
    const text = await res.text()

    // Count VEVENT occurrences
    const eventCount = (text.match(/BEGIN:VEVENT/g) || []).length
    expect(eventCount).toBeLessThanOrEqual(100)
    expect(eventCount).toBe(100) // exactly 100 since we have 120 items
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Correct date assignments
// ─────────────────────────────────────────────────────────────────────────────

describe('date assignments', () => {
  it('assigns months to the 1st of that month', async () => {
    const roadmap = buildRoadmap({
      months: { mar: makeItems(['Maerz Aufgabe']) },
    })

    const res = await callPOST({ roadmap, levels: ['months'], areaIds: ['career'], year: 2026 })
    const text = unfold(await res.text())

    expect(text).toContain('20260301')
  })

  it('assigns quarters to the 1st of quarter start month', async () => {
    const roadmap = buildRoadmap({
      quarters: { q2: makeItems(['Q2 Aufgabe']) },
    })

    const res = await callPOST({ roadmap, levels: ['quarters'], areaIds: ['career'], year: 2026 })
    const text = unfold(await res.text())

    expect(text).toContain('20260401')
  })

  it('assigns q1 to January 1st', async () => {
    const roadmap = buildRoadmap({
      quarters: { q1: makeItems(['Q1 Aufgabe']) },
    })

    const res = await callPOST({ roadmap, levels: ['quarters'], areaIds: ['career'], year: 2026 })
    const text = unfold(await res.text())

    expect(text).toContain('20260101')
  })

  it('assigns q3 to July 1st', async () => {
    const roadmap = buildRoadmap({
      quarters: { q3: makeItems(['Q3 Aufgabe']) },
    })

    const res = await callPOST({ roadmap, levels: ['quarters'], areaIds: ['career'], year: 2026 })
    const text = unfold(await res.text())

    expect(text).toContain('20260701')
  })

  it('assigns q4 to October 1st', async () => {
    const roadmap = buildRoadmap({
      quarters: { q4: makeItems(['Q4 Aufgabe']) },
    })

    const res = await callPOST({ roadmap, levels: ['quarters'], areaIds: ['career'], year: 2026 })
    const text = unfold(await res.text())

    expect(text).toContain('20261001')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// RFC 5545 conformance basics
// ─────────────────────────────────────────────────────────────────────────────

describe('iCal output format', () => {
  it('produces valid iCal structure with VCALENDAR and VEVENT', async () => {
    const roadmap = buildRoadmap({
      goals1y: makeItems(['Jahresziel']),
    })

    const res = await callPOST({ roadmap, levels: ['goals1y'], areaIds: ['career'], year: 2026 })
    const text = await res.text()

    expect(text).toContain('BEGIN:VCALENDAR')
    expect(text).toContain('END:VCALENDAR')
    expect(text).toContain('BEGIN:VEVENT')
    expect(text).toContain('END:VEVENT')
    expect(text).toContain('METHOD:PUBLISH')
  })

  it('returns correct Content-Type header', async () => {
    const roadmap = buildRoadmap({ goals1y: makeItems(['Test']) })
    const res = await callPOST({ roadmap, levels: ['goals1y'], areaIds: ['career'], year: 2026 })

    expect(res.headers.get('Content-Type')).toBe('text/calendar; charset=utf-8')
  })

  it('returns correct Content-Disposition header', async () => {
    const roadmap = buildRoadmap({ goals1y: makeItems(['Test']) })
    const res = await callPOST({ roadmap, levels: ['goals1y'], areaIds: ['career'], year: 2026 })

    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="ziele-roadmap.ics"')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Error handling
// ─────────────────────────────────────────────────────────────────────────────

describe('error handling', () => {
  it('returns 400 for invalid JSON body', async () => {
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost:3000/api/export/ical', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not valid json{{{',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Filtering: area selection
// ─────────────────────────────────────────────────────────────────────────────

describe('area filtering', () => {
  it('only exports events for selected areas', async () => {
    const tl1 = emptyTimeline()
    tl1.goals1y = makeItems(['Karriere Ziel'])
    const tl2 = emptyTimeline()
    tl2.goals1y = makeItems(['Gesundheit Ziel'])

    const roadmap: Roadmap = {
      generatedAt: '2026-01-01T00:00:00.000Z',
      profileHash: 'test',
      lifeAreaRoadmaps: [
        { lifeAreaId: 'career', lifeAreaName: 'Karriere', timeline: tl1 },
        { lifeAreaId: 'health', lifeAreaName: 'Gesundheit', timeline: tl2 },
      ],
    }

    const res = await callPOST({ roadmap, levels: ['goals1y'], areaIds: ['career'], year: 2026 })
    const text = await res.text()

    expect(text).toContain('Karriere Ziel')
    expect(text).not.toContain('Gesundheit Ziel')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Empty roadmap produces no events
// ─────────────────────────────────────────────────────────────────────────────

describe('empty roadmap', () => {
  it('produces valid iCal with no events when roadmap is empty', async () => {
    const roadmap = buildRoadmap()
    const res = await callPOST({ roadmap, levels: ['months'], areaIds: ['career'], year: 2026 })
    const text = await res.text()

    expect(text).toContain('BEGIN:VCALENDAR')
    expect(text).toContain('END:VCALENDAR')
    expect(text).not.toContain('BEGIN:VEVENT')
  })
})
