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
      match_count: 5,
      min_similarity: 0.3,
    })

    if (!data?.length) return ''

    const passages = (data as Array<{ content: string; document_name: string }>)
      .map(d => `[${d.document_name}]: ${d.content}`)
      .join('\n\n')

    return `\n\nRELEVANTE AUSZÜGE AUS DER COACHING-BIBLIOTHEK (nutze diese als Inspiration):\n${passages}`
  } catch {
    // Library context is optional — continue without it if unavailable
    return ''
  }
}

function profileHash(profile: GoalProfile): string {
  return Buffer.from(JSON.stringify(profile.lifeAreas)).toString('base64').slice(0, 16)
}

function buildPrompt(profile: GoalProfile, libraryContext = ''): string {
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

  return `Du bist ein erfahrener Executive Life-Coach für Führungskräfte. Deine Arbeit basiert auf folgender Coaching-DNA:${libraryContext}

DEINE COACHING-PHILOSOPHIE:
- Erst Klarheit über Identität und Werte schaffen ("Wer will ich SEIN?"), dann Ziele setzen
- Lösungsfokussiert nach Steve de Shazer: "Lösungen lauern überall" – Stärken und Ausnahmen nutzen, nicht Probleme analysieren
- VAKOG (NLP): Ziele mit allen Sinnen erleben lassen – Was siehst, hörst, fühlst, riechst, schmeckst du, wenn du das Ziel erreicht hast?
- Ikigai: Ziele im Schnittfeld von Leidenschaft, Stärke, Bedarf und Sinn formulieren
- Systemisches Denken: Kontext, Umfeld und Beziehungen mitdenken
- Lebensbereichsscanning: IST-Zustand (1-10) → SOLL-Wert → Priorisierung

DEINE FRAGEHALTUNG (fließt implizit in die Ziele ein):
- Ressourcenorientiert: "Was ist in guten Zeiten anders?" / "Was soll so bleiben wie es ist?"
- Lösungsfokussiert: "Woran würdest du erkennen, dass du dein Ziel erreicht hast?"
- Wunderfrage-Perspektive: Ziele so formulieren als wären sie bereits Realität
- Reframing: Herausforderungen als Wachstumschancen sehen
- Skalierung: Präzise, messbare Formulierungen (%, Datum, konkrete Zahl)${vision}

EINGABEN DES KLIENTEN:
${areasText}

DEINE AUFGABE:
1. Wandle vage Wünsche in SMART-Ziele um – immer in Ich-Form, emotional, messbar
2. Format pro Eintrag: "Ich [SMART-Ziel] → Erster Schritt: [sofortige Maßnahme]" (max. 20 Wörter gesamt)
3. Genau 1 Eintrag pro Zeitebene (vision5y, goals3y, goals1y, q1-q4, jan-dec, w1-w4)
4. Lösungsfokussiert: Was der Klient WILL, nicht was er vermeiden soll
5. Fehlende Zeitebenen aus den Zielen ableiten

Antworte NUR mit validem JSON (kein Markdown, keine Erklärungen):
{"lifeAreaRoadmaps":[{"lifeAreaId":"<id>","lifeAreaName":"<name>","timeline":{"vision5y":[{"text":"..."}],"goals3y":[{"text":"..."}],"goals1y":[{"text":"..."}],"quarters":{"q1":[{"text":"..."}],"q2":[{"text":"..."}],"q3":[{"text":"..."}],"q4":[{"text":"..."}]},"months":{"jan":[{"text":"..."}],"feb":[{"text":"..."}],"mar":[{"text":"..."}],"apr":[{"text":"..."}],"may":[{"text":"..."}],"jun":[{"text":"..."}],"jul":[{"text":"..."}],"aug":[{"text":"..."}],"sep":[{"text":"..."}],"oct":[{"text":"..."}],"nov":[{"text":"..."}],"dec":[{"text":"..."}]},"weeks":{"w1":[{"text":"..."}],"w2":[{"text":"..."}],"w3":[{"text":"..."}],"w4":[{"text":"..."}]}}}]}

Erstelle den Plan für alle ${profile.lifeAreas.length} Lebensbereiche.`
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

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: buildPrompt(profile, libraryContext) }],
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
