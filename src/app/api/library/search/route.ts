import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { embedQuery } from '@/lib/voyageai'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { query, matchCount = 5 } = await req.json() as { query: string; matchCount?: number }
    if (!query) return NextResponse.json({ error: 'Query fehlt.' }, { status: 400 })

    const embedding = await embedQuery(query)
    const supabase = createServerClient()

    const { data, error } = await supabase.rpc('match_chunks', {
      query_embedding: embedding,
      match_count: matchCount,
      min_similarity: 0.3,
    })

    if (error) throw new Error(error.message)
    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[library/search]', err)
    return NextResponse.json({ error: 'Suche fehlgeschlagen.' }, { status: 500 })
  }
}
