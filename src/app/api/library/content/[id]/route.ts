import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getUserFromRequest, getAppRole } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

interface ChunkRow {
  content: string
  chunk_index: number
}

export async function GET(req: NextRequest, context: RouteContext) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert.' }, { status: 401 })

  const { id: documentId } = await context.params
  const supabase = createServerClient()
  const role = getAppRole(user)

  // Admin and coach can access any document
  if (role !== 'admin' && role !== 'coach') {
    // Client: verify the document was shared with them
    const { data: share } = await supabase
      .from('document_shares')
      .select('document_id')
      .eq('document_id', documentId)
      .eq('client_id', user.id)
      .maybeSingle()

    if (!share) {
      return NextResponse.json({ error: 'Dieses Dokument wurde nicht mit dir geteilt.' }, { status: 403 })
    }
  }

  try {
    // Fetch document metadata
    const { data: doc, error: docErr } = await supabase
      .from('documents')
      .select('id, name, size_bytes, created_at')
      .eq('id', documentId)
      .maybeSingle()

    if (docErr || !doc) {
      return NextResponse.json({ error: 'Dokument nicht gefunden.' }, { status: 404 })
    }

    // Fetch all chunks ordered by index and reconstruct full text
    const { data: chunks, error: chunkErr } = await supabase
      .from('document_chunks')
      .select('content, chunk_index')
      .eq('document_id', documentId)
      .order('chunk_index', { ascending: true })
      .limit(2000)

    if (chunkErr) throw new Error(chunkErr.message)

    const text = (chunks as ChunkRow[] ?? []).map((c) => c.content).join('\n\n')

    return NextResponse.json({ id: doc.id, name: doc.name, text })
  } catch (err) {
    console.error('[library/content GET]', err)
    return NextResponse.json({ error: 'Dokument konnte nicht geladen werden.' }, { status: 500 })
  }
}
