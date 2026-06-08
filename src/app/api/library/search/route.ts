import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase-server'
import { getUserFromRequest, getAppRole } from '@/lib/auth-server'
import { embedQuery } from '@/lib/voyageai'

export const dynamic = 'force-dynamic'

const schema = z.object({
  query: z.string().min(1, 'Query fehlt.').max(500),
  matchCount: z.number().int().min(1).max(10).optional().default(5),
})

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert.' }, { status: 401 })
  const role = getAppRole(user)
  if (role !== 'coach' && role !== 'admin') {
    return NextResponse.json({ error: 'Nur Coaches dürfen die Bibliothek durchsuchen.' }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 }) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const { query, matchCount } = parsed.data
  try {

    const embedding = await embedQuery(query)
    const supabase = createServerClient()

    const { data, error } = await supabase.rpc('match_chunks', {
      query_embedding: embedding,
      match_count: matchCount,
      min_similarity: 0.1,
    })

    if (error) throw new Error(error.message)
    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[library/search]', err)
    return NextResponse.json({ error: 'Suche fehlgeschlagen.' }, { status: 500 })
  }
}

