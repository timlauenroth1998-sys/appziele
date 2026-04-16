import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase-server'
import { getUserFromRequest } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

const schema = z.object({
  coachId: z.string().uuid('Ungültige Coach-ID'),
  action: z.enum(['accept', 'decline']),
})

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { coachId, action } = parsed.data
  const newStatus = action === 'accept' ? 'active' : 'declined'

  const admin = createServerClient()

  // Ensure the pending invitation exists and is addressed to this user
  const { data: existing, error: fetchErr } = await admin
    .from('coach_client_relations')
    .select('status')
    .eq('coach_id', coachId)
    .eq('client_id', user.id)
    .maybeSingle()

  if (fetchErr) {
    console.error('[coach/respond] fetch failed', fetchErr.message)
    return NextResponse.json({ error: 'Einladung konnte nicht geladen werden.' }, { status: 500 })
  }

  if (!existing) {
    return NextResponse.json({ error: 'Einladung nicht gefunden.' }, { status: 404 })
  }

  const { error: updateErr } = await admin
    .from('coach_client_relations')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('coach_id', coachId)
    .eq('client_id', user.id)

  if (updateErr) {
    console.error('[coach/respond] update failed', updateErr.message)
    return NextResponse.json({ error: 'Einladung konnte nicht aktualisiert werden.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
