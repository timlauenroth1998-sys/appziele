import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase-server'
import { getUserFromRequest } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

const schema = z.object({
  partnerId: z.string().uuid('Ungültige Partner-ID'),
})

export async function DELETE(req: NextRequest) {
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

  const { partnerId } = parsed.data

  const admin = createServerClient()

  // Delete either direction of the relation (coach→client or client→coach)
  const { error } = await admin
    .from('coach_client_relations')
    .delete()
    .or(
      `and(coach_id.eq.${user.id},client_id.eq.${partnerId}),` +
      `and(client_id.eq.${user.id},coach_id.eq.${partnerId})`
    )

  if (error) {
    console.error('[coach/disconnect] delete failed', error.message)
    return NextResponse.json({ error: 'Verbindung konnte nicht getrennt werden.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
