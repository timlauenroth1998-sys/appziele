import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { GoalProfile, LifeAreaRoadmap, RoadmapTimeline, RoadmapItem } from '@/lib/types'
import { embedQuery } from '@/lib/voyageai'
import { createServerClient } from '@/lib/supabase-server'

// Edge runtime: no execution timeout for streaming responses
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
      match_count: 10,
      min_similarity: 0.25,
    })

    if (!data?.length) return ''

    const passages = (data as Array<{ content: string; document_name: string }>)
      .map(d => `[${d.document_name}]: ${d.content}`)
      .join('\n\n')

    return `\n\nAUSZÜGE AUS DER COACHING-BIBLIOTHEK DES COACHES (diese Inhalte sind die Grundlage deiner Arbeit – wende sie aktiv an):\n${passages}`
  } catch {
    return ''
  }
}

function profileHash(profile: GoalProfile): string {
  return btoa(JSON.stringify(profile.lifeAreas)).slice(0, 16)
}

const COACH_DNA = `Du bist ein erfahrener Executive Life-Coach für Führungskräfte. Deine Arbeit ist geprägt von tiefer Menschenkenntnis, systemischem Denken und der Überzeugung, dass jeder Mensch die Ressourcen in sich trägt, die er braucht.

DEINE COACHING-DNA (wende diese aktiv an):

1. LÖSUNGSFOKUSSIERT nach Steve de Shazer ("Lösungen lauern überall")
   - Fokus auf Stärken, Ausnahmen und was bereits funktioniert
   - Fragen wie: "Was war in guten Zeiten anders?" / "Woran erkennst du, dass du dein Ziel erreicht hast?"
   - Ressourcen aktivieren statt Probleme analysieren

2. VAKOG – Ziele mit ALLEN SINNEN erleben lassen (NLP)
   - Visuell: Was siehst du, wenn du das Ziel erreicht hast?
   - Auditiv: Was hörst du – was sagen andere, was sagst du dir selbst?
   - Kinästhetisch: Was fühlst du in deinem Körper – Wärme, Leichtigkeit, Kraft?
   - Formuliere Ziele so lebendig, dass der Klient sie innerlich erlebt

3. IKIGAI – Ziele im Schnittfeld von Leidenschaft, Stärke, Bedarf und Sinn
   - Frage immer: Warum ist dieses Ziel wirklich wichtig? Was steckt dahinter?
   - Verbinde Ziele mit dem tieferen Sinn und der Identität des Klienten

4. SMART + EMOTIONAL
   - Spezifisch, Messbar, Attraktiv, Realistisch, Terminiert
   - ABER: nicht trocken – emotional, in Ich-Form, als lebendige Vision

5. WUNDERFRAGE & SYSTEMISCHES DENKEN
   - "Angenommen das Ziel wäre bereits erreicht – was ist dann anders?"
   - Kontext, Umfeld und Beziehungen mitdenken
   - Wer profitiert noch von diesem Ziel? Was verändert sich im System?

6. SKALIERUNG & PRÄZISION
   - Konkrete Zahlen, Daten, messbare Meilensteine
   - "Auf einer Skala von 1-10 – wo stehst du heute, wo willst du hin?"

QUALITÄTSSTANDARD FÜR JEDEN EINTRAG:
Jeder Eintrag soll sich anfühlen wie ein Coaching-Moment. Er soll:
- Den Klienten emotional berühren und motivieren
- Eine klare Handlung auslösen
- Die Sprache und Tiefe eines erfahrenen Coaches tragen
- 2-4 Sätze lang sein – reich, konkret, lebendig`

function buildContextBlock(
  area: GoalProfile['lifeAreas'][0],
  vision5y: string,
  libraryContext: string
): string {
  const goals = [
    area.yearGoal    && `Jahresziel(e): ${area.yearGoal}`,
    area.quarterGoal && `Quartalsziel(e): ${area.quarterGoal}`,
    area.monthGoal   && `Monatsziel(e): ${area.monthGoal}`,
    area.weekGoal    && `Wochenziel(e): ${area.weekGoal}`,
  ].filter(Boolean).join('\n')

  const visionLine = vision5y ? `\n5-Jahres-Vision des Klienten: ${vision5y}\n` : ''

  return `${COACH_DNA}${libraryContext}
${visionLine}
LEBENSBEREICH: ${area.name}
${goals}

PRO ZEITEBENE: 2-3 Einträge. Jeder Eintrag ist ein vollständiger Coaching-Impuls:
- Formuliert in Ich-Form, emotional lebendig (VAKOG)
- SMART: konkret, messbar, terminiert
- Mit einem unmittelbaren ersten Schritt
- Reich an Coaching-DNA: Ressourcenfragen, Skalierung, Wunderfrage-Perspektive
- 2-4 Sätze pro Eintrag

FORMAT pro Eintrag:
"[Emotionale Ich-Vision in Präsens]. [Konkrete SMART-Formulierung mit Datum/Zahl]. → Erster Schritt: [sofort umsetzbare Maßnahme] → Reflexionsfrage: [lösungsfokussierte Frage die Energie freisetzt]"

WICHTIG: Antworte NUR mit kompaktem JSON ohne Zeilenumbrüche oder Einrückungen – alles in einer einzigen Zeile.`
}

// Call 1: Strategic horizon (vision, 3y, 1y, quarters)
function buildStrategicPrompt(
  area: GoalProfile['lifeAreas'][0],
  vision5y: string,
  libraryContext: string
): string {
  return `${buildContextBlock(area, vision5y, libraryContext)}

DEINE AUFGABE – NUR STRATEGISCHE EBENEN:
Erstelle die strategischen Zeitebenen für Lebensbereich "${area.name}".

{"vision5y":[{"text":"..."},{"text":"..."},{"text":"..."}],"goals3y":[{"text":"..."},{"text":"..."},{"text":"..."}],"goals1y":[{"text":"..."},{"text":"..."},{"text":"..."}],"quarters":{"q1":[{"text":"..."},{"text":"..."},{"text":"..."}],"q2":[{"text":"..."},{"text":"..."},{"text":"..."}],"q3":[{"text":"..."},{"text":"..."},{"text":"..."}],"q4":[{"text":"..."},{"text":"..."},{"text":"..."}]}}`
}

// Call 2: Tactical horizon (months, weeks)
function buildTacticalPrompt(
  area: GoalProfile['lifeAreas'][0],
  vision5y: string,
  libraryContext: string
): string {
  return `${buildContextBlock(area, vision5y, libraryContext)}

DEINE AUFGABE – NUR OPERATIVE EBENEN:
Erstelle die monatlichen und wöchentlichen Zeitebenen für Lebensbereich "${area.name}".

{"months":{"jan":[{"text":"..."},{"text":"..."}],"feb":[{"text":"..."},{"text":"..."}],"mar":[{"text":"..."},{"text":"..."}],"apr":[{"text":"..."},{"text":"..."}],"may":[{"text":"..."},{"text":"..."}],"jun":[{"text":"..."},{"text":"..."}],"jul":[{"text":"..."},{"text":"..."}],"aug":[{"text":"..."},{"text":"..."}],"sep":[{"text":"..."},{"text":"..."}],"oct":[{"text":"..."},{"text":"..."}],"nov":[{"text":"..."},{"text":"..."}],"dec":[{"text":"..."},{"text":"..."}]},"weeks":{"w1":[{"text":"..."},{"text":"..."},{"text":"..."}],"w2":[{"text":"..."},{"text":"..."},{"text":"..."}],"w3":[{"text":"..."},{"text":"..."},{"text":"..."}],"w4":[{"text":"..."},{"text":"..."},{"text":"..."}]}}`
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
  // Run strategic and tactical calls in parallel
  const [strategicMsg, tacticalMsg] = await Promise.all([
    client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 7000,
      messages: [{ role: 'user', content: buildStrategicPrompt(area, vision5y, libraryContext) }],
    }),
    client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 7000,
      messages: [{ role: 'user', content: buildTacticalPrompt(area, vision5y, libraryContext) }],
    }),
  ])

  const strategicText = strategicMsg.content[0].type === 'text' ? strategicMsg.content[0].text : ''
  const tacticalText  = tacticalMsg.content[0].type === 'text'  ? tacticalMsg.content[0].text  : ''

  const strategicMatch = strategicText.match(/\{[\s\S]*\}/)
  const tacticalMatch  = tacticalText.match(/\{[\s\S]*\}/)

  if (!strategicMatch) throw new Error(`Strategische Antwort für "${area.name}" ungültig.`)
  if (!tacticalMatch)  throw new Error(`Taktische Antwort für "${area.name}" ungültig.`)

  const s = JSON.parse(strategicMatch[0]) as Record<string, unknown>
  const t = JSON.parse(tacticalMatch[0])  as Record<string, unknown>

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

  return { lifeAreaId: area.id, lifeAreaName: area.name, timeline: tl }
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[roadmap/generate] ANTHROPIC_API_KEY is not set')
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

        // Each area makes 2 parallel sub-calls (strategic + tactical), all areas run in parallel
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
