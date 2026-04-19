import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getUserFromRequest } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

interface ShareRow {
  document_id: string
  coach_id: string
  created_at: string
  documents: { id: string; name: string; size_bytes: number; chunk_count: number } | null
}

// GET: client fetches their shared documents
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert.' }, { status: 401 })

  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('document_shares')
      .select('document_id, coach_id, created_at, documents(id, name, size_bytes, chunk_count)')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw new Error(error.message)

    const result = ((data as unknown as ShareRow[]) ?? []).map((row) => ({
      documentId: row.document_id,
      coachId: row.coach_id,
      sharedAt: row.created_at,
      document: row.documents,
    }))

    return NextResponse.json(result)
  } catch (err) {
    console.error('[library/shared GET]', err)
    return NextResponse.json({ error: 'Geteilte Dokumente konnten nicht geladen werden.' }, { status: 500 })
  }
}
