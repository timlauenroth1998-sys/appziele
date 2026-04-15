import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { GoalProfile, Roadmap, LifeAreaRoadmap, RoadmapTimeline, RoadmapItem } from '@/lib/types'
import { embedQuery } from '@/lib/voyageai'
import { createServerClient } from '@/lib/supabase-server'

// Extend Vercel function timeout (requires Pro plan; no-op on Hobby but harmless)
export const maxDuration = 60
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
    // Library context is optional — continue without it if unavailable
    return ''
  }
}

function profileHash(profile: GoalProfile): string {
  return Buffer.from(JSON.stringify(profile.lifeAreas)).toString('base64').slice(0, 16)
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

function buildAreaPrompt(
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

DEINE AUFGABE:
Erstelle einen vollständigen, tiefgreifenden Coaching-Fahrplan NUR für den Lebensbereich "${area.name}".

PRO ZEITEBENE: 2-3 Einträge. Jeder Eintrag ist ein vollständiger Coaching-Impuls:
- Formuliert in Ich-Form, emotional lebendig (VAKOG)
- SMART: konkret, messbar, terminiert
- Mit einem unmittelbaren ersten Schritt
- Reich an Coaching-DNA: Ressourcenfragen, Skalierung, Wunderfrage-Perspektive
- 2-4 Sätze pro Eintrag

FORMAT pro Eintrag (als einzelner "text"-Wert):
"[Emotionale Ich-Vision in Präsens]. [Konkrete SMART-Formulierung mit Datum/Zahl]. → Erster Schritt: [sofort umsetzbare Maßnahme] → Reflexionsfrage: [lösungsfokussierte Frage die Energie freisetzt]"

WICHTIG: Antworte NUR mit kompaktem JSON ohne Zeilenumbrüche oder Einrückungen – alles in einer einzigen Zeile:
{"lifeAreaId":"${area.id}","lifeAreaName":"${area.name}","timeline":{"vision5y":[{"text":"..."},{"text":"..."}],"goals3y":[{"text":"..."},{"text":"..."}],"goals1y":[{"text":"..."},{"text":"..."}],"quarters":{"q1":[{"text":"..."},{"text":"..."}],"q2":[{"text":"..."},{"text":"..."}],"q3":[{"text":"..."},{"text":"..."}],"q4":[{"text":"..."},{"text":"..."}]},"months":{"jan":[{"text":"..."},{"text":"..."}],"feb":[{"text":"..."},{"text":"..."}],"mar":[{"text":"..."},{"text":"..."}],"apr":[{"text":"..."},{"text":"..."}],"may":[{"text":"..."},{"text":"..."}],"jun":[{"text":"..."},{"text":"..."}],"jul":[{"text":"..."},{"text":"..."}],"aug":[{"text":"..."},{"text":"..."}],"sep":[{"text":"..."},{"text":"..."}],"oct":[{"text":"..."},{"text":"..."}],"nov":[{"text":"..."},{"text":"..."}],"dec":[{"text":"..."},{"text":"..."}]},"weeks":{"w1":[{"text":"..."},{"text":"..."}],"w2":[{"text":"..."},{"text":"..."}],"w3":[{"text":"..."},{"text":"..."}],"w4":[{"text":"..."},{"text":"..."}]}}}`
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('[roadmap/generate] ANTHROPIC_API_KEY is not set')
      return NextResponse.json({ error: 'KI-Service nicht konfiguriert. Bitte ANTHROPIC_API_KEY in Vercel setzen.' }, { status: 500 })
    }

    const profile: GoalProfile = await req.json()

    if (!profile?.lifeAreas?.length) {
      return NextResponse.json({ error: 'Keine Ziele vorhanden.' }, { status: 400 })
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    // RAG: fetch relevant passages from coaching library (optional — silent fallback)
    const libraryContext = await fetchLibraryContext(profile)

    // Generate each life area in parallel — one small focused API call per area
    const areaResults = await Promise.all(
      profile.lifeAreas.map(area =>
        client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 8000,
          messages: [{ role: 'user', content: buildAreaPrompt(area, profile.vision5y ?? '', libraryContext) }],
        })
      )
    )

    const lifeAreaRoadmaps: LifeAreaRoadmap[] = areaResults.map((message, idx) => {
      const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error(`KI-Antwort für "${profile.lifeAreas[idx].name}" konnte nicht verarbeitet werden.`)

      const parsed = JSON.parse(jsonMatch[0]) as { lifeAreaId: string; lifeAreaName: string; timeline: Record<string, unknown> }
      const area = parsed
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
    })  // end areaResults.map

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
