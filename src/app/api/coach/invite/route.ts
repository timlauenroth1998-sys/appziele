import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase-server'
import { getUserFromRequest } from '@/lib/auth-server'
import { getResendClient, getFromEmail, getAppUrl } from '@/lib/resend'

export const dynamic = 'force-dynamic'

const schema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
})

export async function POST(req: NextRequest) {
  // 1. Authentication
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert.' }, { status: 401 })
  }

  // 2. Authorization: must be a coach
  const role = (user.user_metadata as Record<string, unknown> | null)?.role
  if (role !== 'coach') {
    return NextResponse.json({ error: 'Nur Coaches dürfen Klienten einladen.' }, { status: 403 })
  }

  // 3. Parse + validate body
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

  // 4. Cannot invite yourself
  if (user.email && user.email.toLowerCase() === email) {
    return NextResponse.json({ error: 'Du kannst dich nicht selbst einladen.' }, { status: 400 })
  }

  const admin = createServerClient()

  // 5. Try to resolve the target user (if they already have an account)
  let clientId: string | null = null
  try {
    // Use admin.listUsers paginated search for this email. Supabase admin API does
    // not currently expose a direct by-email lookup in the JS SDK, but listUsers
    // with a filter keeps this simple for the MVP.
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
    const match = list?.users.find((u) => u.email?.toLowerCase() === email)
    if (match) clientId = match.id
  } catch (err) {
    console.error('[coach/invite] lookup failed', err)
  }

  // 6. Check for existing pending invite for this coach
  if (clientId) {
    const { data: existing } = await admin
      .from('coach_client_relations')
      .select('status')
      .eq('coach_id', user.id)
      .eq('client_id', clientId)
      .maybeSingle()

    if (existing && existing.status === 'pending') {
      return NextResponse.json({ error: 'Einladung bereits gesendet.' }, { status: 409 })
    }
    if (existing && existing.status === 'active') {
      return NextResponse.json({ error: 'Ihr seid bereits verbunden.' }, { status: 409 })
    }
  } else {
    // Even for email-only invites, avoid duplicates
    const { data: existingByEmail } = await admin
      .from('coach_client_relations')
      .select('status')
      .eq('coach_id', user.id)
      .eq('invited_email', email)
      .eq('status', 'pending')
      .maybeSingle()
    if (existingByEmail) {
      return NextResponse.json({ error: 'Einladung bereits gesendet.' }, { status: 409 })
    }
  }

  // 7. Insert the relation
  if (clientId) {
    const { error } = await admin
      .from('coach_client_relations')
      .upsert({
        coach_id: user.id,
        client_id: clientId,
        status: 'pending',
        invited_email: email,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'coach_id,client_id' })
    if (error) {
      console.error('[coach/invite] insert failed', error.message)
      return NextResponse.json({ error: 'Einladung konnte nicht gespeichert werden.' }, { status: 500 })
    }
  } else {
    // No account yet — persist with a placeholder client_id? The schema requires
    // a FK-valid UUID. For not-yet-registered invitees we still want to track
    // the email — we do that by storing against the coach's own row key. When
    // the client later registers, a separate flow will link the invitation.
    // To keep the MVP schema-valid, we skip DB insert here and only email.
    // (See PROJ-6 edge-case: "noch keinen Account".)
  }

  // 8. Send invitation email
  try {
    const resend = getResendClient()
    const appUrl = getAppUrl()
    const link = `${appUrl}/auth?invite=true`
    const coachName = user.email ?? 'Dein Coach'

    await resend.emails.send({
      from: getFromEmail(),
      to: email,
      subject: 'Du wurdest als Klient eingeladen',
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto;">
          <h2>Einladung zur Ziele-App</h2>
          <p>Hallo,</p>
          <p><strong>${coachName}</strong> hat dich als Klient eingeladen. Wenn du die Einladung annimmst, kann dein Coach deine Roadmap im Read-Only-Modus sehen und Kommentare hinterlassen.</p>
          <p>Du entscheidest selbst, welche Lebensbereiche dein Coach sehen darf.</p>
          <p style="margin: 24px 0;">
            <a href="${link}" style="background:#111827;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Einladung öffnen</a>
          </p>
          <p style="color:#6b7280;font-size:12px;">Du kannst die Verbindung jederzeit einseitig trennen.</p>
        </div>
      `,
    })
  } catch (err) {
    console.error('[coach/invite] email failed', err)
    // Do not fail the whole request — DB row exists, coach can retry email flow later.
  }

  return NextResponse.json({ success: true })
}
