import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase-server'
import { getUserFromRequest, getAppRole } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert.' }, { status: 401 })
  const role = getAppRole(user)
  if (role !== 'coach' && role !== 'admin') {
    return NextResponse.json({ error: 'Nur Coaches dürfen Freigaben einsehen.' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('clientId')
  if (!clientId || !/^[0-9a-f-]{36}$/i.test(clientId)) {
    return NextResponse.json({ error: 'Ungültige Klienten-ID.' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('document_shares')
    .select('document_id')
    .eq('coach_id', user.id)
    .eq('client_id', clientId)

  if (error) {
    console.error('[library/share GET]', error.message)
    return NextResponse.json({ error: 'Laden fehlgeschlagen.' }, { status: 500 })
  }

  return NextResponse.json((data ?? []).map((r) => ({ documentId: r.document_id })))
}

const shareSchema = z.object({
  documentId: z.string().uuid('Ungültige Dokument-ID'),
  clientId: z.string().uuid('Ungültige Klienten-ID'),
})

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert.' }, { status: 401 })
  const role = getAppRole(user)
  if (role !== 'coach' && role !== 'admin') {
    return NextResponse.json({ error: 'Nur Coaches dürfen Dokumente teilen.' }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 }) }
  const parsed = shareSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const { documentId, clientId } = parsed.data
  const supabase = createServerClient()

  // Verify the client is actually connected to this coach
  const { data: relation } = await supabase
    .from('coach_client_relations')
    .select('status')
    .eq('coach_id', user.id)
    .eq('client_id', clientId)
    .eq('status', 'active')
    .maybeSingle()

  if (!relation) {
    return NextResponse.json({ error: 'Kein aktiver Klient mit dieser ID verbunden.' }, { status: 403 })
  }

  const { error } = await supabase
    .from('document_shares')
    .upsert({ document_id: documentId, coach_id: user.id, client_id: clientId }, {
      onConflict: 'document_id,coach_id,client_id',
    })

  if (error) {
    console.error('[library/share POST]', error.message)
    return NextResponse.json({ error: 'Teilen fehlgeschlagen.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

const unshareSchema = z.object({
  documentId: z.string().uuid('Ungültige Dokument-ID'),
  clientId: z.string().uuid('Ungültige Klienten-ID'),
})

export async function DELETE(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert.' }, { status: 401 })
  const role = getAppRole(user)
  if (role !== 'coach' && role !== 'admin') {
    return NextResponse.json({ error: 'Nur Coaches dürfen Teilen aufheben.' }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 }) }
  const parsed = unshareSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const { documentId, clientId } = parsed.data
  const supabase = createServerClient()

  const { error } = await supabase
    .from('document_shares')
    .delete()
    .eq('document_id', documentId)
    .eq('coach_id', user.id)
    .eq('client_id', clientId)

  if (error) {
    console.error('[library/share DELETE]', error.message)
    return NextResponse.json({ error: 'Teilen aufheben fehlgeschlagen.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
