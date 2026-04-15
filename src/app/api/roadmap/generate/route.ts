import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { jsonrepair } from 'jsonrepair'
import { GoalProfile, LifeAreaRoadmap, RoadmapTimeline, RoadmapItem } from '@/lib/types'
import { embedQuery } from '@/lib/voyageai'
import { createServerClient } from '@/lib/supabase-server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

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

async function fetchLibraryContext(profile: GoalProfile): Promise<string> {
  try {
    const query = [
      profile.vision5y,
      ...profile.lifeAreas.map(a => `${a.name}: ${a.yearGoal}`),
    ].filter(Boolean).join(' ')

    const embedding = await embedQuery(query)
    const supabase = createServerClient()
    const { data } = await supabase.rpc('match_chunks', {
      query_embedding: embedding,
      match_count: 8,
      min_similarity: 0.25,
    })

    if (!data?.length) return ''

    const passages = (data as Array<{ content: string; document_name: string }>)
      .map(d => `[${d.document_name}]: ${d.content}`)
      .join('\n\n')

    return `\n\nAUSZÜGE AUS DER COACHING-BIBLIOTHEK (wende diese aktiv an):\n${passages}`
  } catch {
    return ''
  }
}

function profileHash(profile: GoalProfile): string {
  const str = JSON.stringify(profile.lifeAreas)
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0
  }
  return (hash >>> 0).toString(36)
}

const COACH_DNA = `Du bist ein erfahrener Executive Life-Coach. Deine Coaching-DNA:
1. LÖSUNGSFOKUSSIERT (de Shazer): Stärken, Ausnahmen, Ressourcen aktivieren
2. VAKOG (NLP): Ziele visuell, auditiv, kinästhetisch erleben lassen
3. IKIGAI: Ziele mit tieferem Sinn und Identität verbinden
4. SMART+EMOTIONAL: Konkret, messbar, terminiert – aber lebendig und in Ich-Form
5. WUNDERFRAGE: "Was ist anders, wenn das Ziel erreicht ist?"
6. SKALIERUNG: Konkrete Zahlen, Daten, messbare Meilensteine

QUALITÄTSSTANDARD: Jeder Eintrag = ein Coaching-Moment.
FORMAT: "[Emotionale Ich-Vision]. [SMART-Formulierung mit Datum/Zahl]. → Erster Schritt: [Maßnahme] → Reflexionsfrage: [Lösungsfokussierte Frage]"
Genau 2 Einträge pro Zeitebene. Jeder Eintrag 2-3 Sätze. In Ich-Form. Nur JSON, keine Erklärungen.`

function contextBlock(area: GoalProfile['lifeAreas'][0], vision5y: string, libraryContext: string): string {
  const goals = [
    area.yearGoal    && `Jahresziel(e): ${area.yearGoal}`,
    area.quarterGoal && `Quartalsziel(e): ${area.quarterGoal}`,
    area.monthGoal   && `Monatsziel(e): ${area.monthGoal}`,
    area.weekGoal    && `Wochenziel(e): ${area.weekGoal}`,
  ].filter(Boolean).join('\n')

  return `${COACH_DNA}${libraryContext}
${vision5y ? `\n5-Jahres-Vision: ${vision5y}` : ''}
Lebensbereich: ${area.name}
${goals}`
}

function call(client: Anthropic, prompt: string) {
  return client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  })
}

function extractJson(text: string, label: string): Record<string, unknown> {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`JSON für "${label}" nicht gefunden.`)
  return JSON.parse(jsonrepair(match[0])) as Record<string, unknown>
}

const toItems = (arr: unknown): RoadmapItem[] =>
  Array.isArray(arr) ? arr.map((x: unknown) => makeItem(
    typeof x === 'object' && x !== null && 'text' in x
      ? String((x as { text: string }).text)
      : String(x)
  )) : []

async function generateArea(
  client: Anthropic,
  area: GoalProfile['lifeAreas'][0],
  vision5y: string,
  libraryContext: string
): Promise<LifeAreaRoadmap> {
  const ctx = contextBlock(area, vision5y, libraryContext)
  const name = area.name

  // 4 parallel calls — each stays well under 4000 tokens
  const [r1, r2, r3, r4] = await Promise.all([

    // Call 1: Strategic (vision, 3y, 1y, quarters) — ~12 entries
    call(client, `${ctx}

AUFGABE: Strategische Ebenen für "${name}". Antworte NUR mit diesem JSON (eine Zeile):
{"vision5y":[{"text":"..."},{"text":"..."}],"goals3y":[{"text":"..."},{"text":"..."}],"goals1y":[{"text":"..."},{"text":"..."}],"quarters":{"q1":[{"text":"..."},{"text":"..."}],"q2":[{"text":"..."},{"text":"..."}],"q3":[{"text":"..."},{"text":"..."}],"q4":[{"text":"..."},{"text":"..."}]}}`),

    // Call 2: Months Jan–Jun — ~12 entries
    call(client, `${ctx}

AUFGABE: Monatsziele Januar bis Juni für "${name}". Antworte NUR mit diesem JSON (eine Zeile):
{"jan":[{"text":"..."},{"text":"..."}],"feb":[{"text":"..."},{"text":"..."}],"mar":[{"text":"..."},{"text":"..."}],"apr":[{"text":"..."},{"text":"..."}],"may":[{"text":"..."},{"text":"..."}],"jun":[{"text":"..."},{"text":"..."}]}`),

    // Call 3: Months Jul–Dec — ~12 entries
    call(client, `${ctx}

AUFGABE: Monatsziele Juli bis Dezember für "${name}". Antworte NUR mit diesem JSON (eine Zeile):
{"jul":[{"text":"..."},{"text":"..."}],"aug":[{"text":"..."},{"text":"..."}],"sep":[{"text":"..."},{"text":"..."}],"oct":[{"text":"..."},{"text":"..."}],"nov":[{"text":"..."},{"text":"..."}],"dec":[{"text":"..."},{"text":"..."}]}`),

    // Call 4: Weeks — ~8 entries
    call(client, `${ctx}

AUFGABE: Wochenziele (Musterwoche) für "${name}". Antworte NUR mit diesem JSON (eine Zeile):
{"w1":[{"text":"..."},{"text":"..."}],"w2":[{"text":"..."},{"text":"..."}],"w3":[{"text":"..."},{"text":"..."}],"w4":[{"text":"..."},{"text":"..."}]}`),
  ])

  const getText = (msg: Awaited<ReturnType<typeof call>>) =>
    msg.content[0].type === 'text' ? msg.content[0].text : ''

  const s = extractJson(getText(r1), `${name} Strategie`)
  const h1 = extractJson(getText(r2), `${name} Jan-Jun`)
  const h2 = extractJson(getText(r3), `${name} Jul-Dez`)
  const w = extractJson(getText(r4), `${name} Wochen`)

  const tl = emptyTimeline()

  tl.vision5y = toItems(s.vision5y)
  tl.goals3y  = toItems(s.goals3y)
  tl.goals1y  = toItems(s.goals1y)

  const q = s.quarters as Record<string, unknown> | undefined
  if (q) {
    tl.quarters.q1 = toItems(q.q1)
    tl.quarters.q2 = toItems(q.q2)
    tl.quarters.q3 = toItems(q.q3)
    tl.quarters.q4 = toItems(q.q4)
  }

  for (const key of ['jan','feb','mar','apr','may','jun'] as const) tl.months[key] = toItems(h1[key])
  for (const key of ['jul','aug','sep','oct','nov','dec'] as const) tl.months[key] = toItems(h2[key])
  for (const key of ['w1','w2','w3','w4'] as const) tl.weeks[key] = toItems(w[key])

  return { lifeAreaId: area.id, lifeAreaName: area.name, timeline: tl }
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'KI-Service nicht konfiguriert. Bitte ANTHROPIC_API_KEY in Vercel setzen.' }, { status: 500 })
  }

  let profile: GoalProfile
  try {
    profile = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  if (!profile?.lifeAreas?.length) {
    return NextResponse.json({ error: 'Keine Ziele vorhanden.' }, { status: 400 })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const encoder = new TextEncoder()
  const hash = profileHash(profile)

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))
      }

      try {
        const libraryContext = await fetchLibraryContext(profile)

        await Promise.all(
          profile.lifeAreas.map(async (area) => {
            try {
              const lifeAreaRoadmap = await generateArea(client, area, profile.vision5y ?? '', libraryContext)
              send({ type: 'area', data: lifeAreaRoadmap })
            } catch (err) {
              console.error(`[roadmap/generate] Area "${area.name}" failed:`, err)
              send({ type: 'area_error', areaName: area.name, message: err instanceof Error ? err.message : String(err) })
            }
          })
        )

        send({ type: 'done', profileHash: hash })
      } catch (err) {
        console.error('[roadmap/generate]', err)
        send({ type: 'error', message: err instanceof Error ? err.message : 'Generierung fehlgeschlagen.' })
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson' },
  })
}
