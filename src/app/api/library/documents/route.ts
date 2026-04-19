import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase-server'
import { getUserFromRequest, getAppRole } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert.' }, { status: 401 })
  if (getAppRole(user) !== 'admin') return NextResponse.json({ error: 'Nur Admins dürfen Dokumente abrufen.' }, { status: 403 })

  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('documents')
      .select('id, name, size_bytes, chunk_count, created_at')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) throw new Error(error.message)
    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[library/documents GET]', err)
    return NextResponse.json({ error: 'Dokumente konnten nicht geladen werden.' }, { status: 500 })
  }
}

const deleteSchema = z.object({ id: z.string().uuid('Ungültige Dokument-ID') })

export async function DELETE(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert.' }, { status: 401 })
  if (getAppRole(user) !== 'admin') return NextResponse.json({ error: 'Nur Admins dürfen Dokumente löschen.' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 }) }
  const parsed = deleteSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    const supabase = createServerClient()
    const { error } = await supabase.from('documents').delete().eq('id', parsed.data.id)
    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[library/documents DELETE]', err)
    return NextResponse.json({ error: 'Löschen fehlgeschlagen.' }, { status: 500 })
  }
}
