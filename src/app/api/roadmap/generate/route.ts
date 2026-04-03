import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { GoalProfile, Roadmap, LifeAreaRoadmap, RoadmapTimeline, RoadmapItem } from '@/lib/types'

const client = new Anthropic()

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

function makeItem(text: string): RoadmapItem {
  return { id: makeId(), text, isEdited: false }
}

function emptyTimeline(): RoadmapTimeline {
  return {
    vision5y: [], goals3y: [], goals1y: [],
    quarters: { q1: [], q2: [], q3: [], q4: [] },
    months: { jan: [], feb: [], mar: [], apr: [], may: [], jun: [], jul: [], aug: [], sep: [], oct: [], nov: [], dec: [] },
    weeks: { w1: [], w2: [], w3: [], w4: [] },
  }
}

function profileHash(profile: GoalProfile): string {
  return Buffer.from(JSON.stringify(profile.lifeAreas)).toString('base64').slice(0, 16)
}

function buildPrompt(profile: GoalProfile): string {
  const areasText = profile.lifeAreas.map(area => {
    const lines = [`Lebensbereich: ${area.name}`]
    if (area.yearGoal)    lines.push(`  Jahresziel: ${area.yearGoal}`)
    if (area.quarterGoal) lines.push(`  Quartalsziel: ${area.quarterGoal}`)
    if (area.monthGoal)   lines.push(`  Monatsziel: ${area.monthGoal}`)
    if (area.weekGoal)    lines.push(`  Wochenziel: ${area.weekGoal}`)
    return lines.join('\n')
  }).join('\n\n')

  const vision = profile.vision5y
    ? `\n\n5-Jahres-Vision des Nutzers:\n${profile.vision5y}`
    : ''

  return `Du bist ein erfahrener Life-Coach und Stratege. Erstelle auf Basis der folgenden Ziele einen vollständigen, konkreten Fahrplan.${vision}

Ziele des Nutzers:
${areasText}

Erstelle für JEDEN Lebensbereich einen strukturierten Plan mit konkreten, umsetzbaren Aktionsschritten (max. 2-3 pro Zeitebene). Sei präzise und motivierend. Leite fehlende Zeitebenen intelligent aus den vorhandenen Zielen ab.

WICHTIG: Antworte NUR mit validem JSON im folgenden Schema. Keine Erklärungen, kein Markdown, nur JSON.

{
  "lifeAreaRoadmaps": [
    {
      "lifeAreaId": "<id aus den Eingabedaten>",
      "lifeAreaName": "<name>",
      "timeline": {
        "vision5y": [{"text": "Aktionsschritt"}],
        "goals3y": [{"text": "..."}, {"text": "..."}],
        "goals1y": [{"text": "..."}, {"text": "..."}],
        "quarters": {
          "q1": [{"text": "..."}],
          "q2": [{"text": "..."}],
          "q3": [{"text": "..."}],
          "q4": [{"text": "..."}]
        },
        "months": {
          "jan": [{"text": "..."}], "feb": [{"text": "..."}], "mar": [{"text": "..."}],
          "apr": [{"text": "..."}], "may": [{"text": "..."}], "jun": [{"text": "..."}],
          "jul": [{"text": "..."}], "aug": [{"text": "..."}], "sep": [{"text": "..."}],
          "oct": [{"text": "..."}], "nov": [{"text": "..."}], "dec": [{"text": "..."}]
        },
        "weeks": {
          "w1": [{"text": "..."}],
          "w2": [{"text": "..."}],
          "w3": [{"text": "..."}],
          "w4": [{"text": "..."}]
        }
      }
    }
  ]
}

Erstelle den Plan für alle ${profile.lifeAreas.length} Lebensbereiche. Antworte nur mit JSON.`
}

export async function POST(req: NextRequest) {
  try {
    const profile: GoalProfile = await req.json()

    if (!profile?.lifeAreas?.length) {
      return NextResponse.json({ error: 'Keine Ziele vorhanden.' }, { status: 400 })
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      messages: [{ role: 'user', content: buildPrompt(profile) }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Parse JSON – strip potential markdown code fences
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'KI-Antwort konnte nicht verarbeitet werden.' }, { status: 500 })
    }

    const parsed = JSON.parse(jsonMatch[0]) as { lifeAreaRoadmaps: Array<{ lifeAreaId: string; lifeAreaName: string; timeline: Record<string, unknown> }> }

    const lifeAreaRoadmaps: LifeAreaRoadmap[] = parsed.lifeAreaRoadmaps.map(area => {
      const t = area.timeline as Record<string, unknown>
      const tl = emptyTimeline()

      const toItems = (arr: unknown): RoadmapItem[] =>
        Array.isArray(arr) ? arr.map((x: unknown) => makeItem(typeof x === 'object' && x !== null && 'text' in x ? String((x as {text: string}).text) : String(x))) : []

      tl.vision5y = toItems(t.vision5y)
      tl.goals3y  = toItems(t.goals3y)
      tl.goals1y  = toItems(t.goals1y)

      const q = t.quarters as Record<string, unknown> | undefined
      if (q) {
        tl.quarters.q1 = toItems(q.q1)
        tl.quarters.q2 = toItems(q.q2)
        tl.quarters.q3 = toItems(q.q3)
        tl.quarters.q4 = toItems(q.q4)
      }

      const m = t.months as Record<string, unknown> | undefined
      if (m) {
        for (const key of ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'] as const) {
          tl.months[key] = toItems(m[key])
        }
      }

      const w = t.weeks as Record<string, unknown> | undefined
      if (w) {
        tl.weeks.w1 = toItems(w.w1)
        tl.weeks.w2 = toItems(w.w2)
        tl.weeks.w3 = toItems(w.w3)
        tl.weeks.w4 = toItems(w.w4)
      }

      return { lifeAreaId: area.lifeAreaId, lifeAreaName: area.lifeAreaName, timeline: tl }
    })

    const roadmap: Roadmap = {
      generatedAt: new Date().toISOString(),
      profileHash: profileHash(profile),
      lifeAreaRoadmaps,
    }

    return NextResponse.json(roadmap)
  } catch (err) {
    console.error('[roadmap/generate]', err)
    return NextResponse.json({ error: 'Generierung fehlgeschlagen. Bitte erneut versuchen.' }, { status: 500 })
  }
}
