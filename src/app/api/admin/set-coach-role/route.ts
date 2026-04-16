import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase-server'
import { getUserFromRequest } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

const schema = z.object({
  userId: z.string().uuid('Ungültige Nutzer-ID'),
  isCoach: z.boolean(),
})

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert.' }, { status: 401 })
  }

  const role = (user.user_metadata as Record<string, unknown> | null)?.role
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Nur Admins dürfen Coach-Rechte vergeben.' }, { status: 403 })
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

  const { userId, isCoach } = parsed.data
  const admin = createServerClient()

  const { data: target, error: fetchErr } = await admin.auth.admin.getUserById(userId)
  if (fetchErr || !target?.user) {
    return NextResponse.json({ error: 'Nutzer nicht gefunden.' }, { status: 404 })
  }

  const existingMeta = (target.user.user_metadata ?? {}) as Record<string, unknown>
  // Never downgrade an admin via this endpoint
  if (existingMeta.role === 'admin') {
    return NextResponse.json({ error: 'Admin-Rolle kann nicht geändert werden.' }, { status: 400 })
  }

  const newMeta = { ...existingMeta, role: isCoach ? 'coach' : 'user' }

  const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: newMeta,
  })

  if (updateErr) {
    console.error('[admin/set-coach-role] update failed', updateErr.message)
    return NextResponse.json({ error: 'Rolle konnte nicht aktualisiert werden.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
