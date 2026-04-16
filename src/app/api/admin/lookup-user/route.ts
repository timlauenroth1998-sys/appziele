import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase-server'
import { getUserFromRequest } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

const schema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
})

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert.' }, { status: 401 })
  }

  const role = (user.user_metadata as Record<string, unknown> | null)?.role
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Nur Admins dürfen Nutzer suchen.' }, { status: 403 })
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

  const email = parsed.data.email.toLowerCase().trim()
  const admin = createServerClient()

  // Paginated search — MVP-simple. For larger user bases, move to a single-record lookup.
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (listErr) {
    console.error('[admin/lookup-user] listUsers failed', listErr.message)
    return NextResponse.json({ error: 'Nutzer-Suche fehlgeschlagen.' }, { status: 500 })
  }

  const match = list.users.find((u) => u.email?.toLowerCase() === email)
  if (!match) {
    return NextResponse.json({ error: 'Kein Nutzer mit dieser E-Mail gefunden.' }, { status: 404 })
  }

  const userRole = (match.user_metadata as Record<string, unknown> | null)?.role
  const normalizedRole: 'user' | 'coach' | 'admin' =
    userRole === 'admin' ? 'admin' : userRole === 'coach' ? 'coach' : 'user'

  return NextResponse.json({
    userId: match.id,
    email: match.email ?? email,
    role: normalizedRole,
  })
}
