import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase-server'
import { getUserFromRequest } from '@/lib/auth-server'
import { getResendClient, getFromEmail, getAppUrl } from '@/lib/resend'

export const dynamic = 'force-dynamic'

const schema = z.object({
  clientName: z.string().optional(),
})

// In-memory rate limiter: at most 1 notification per client per hour.
const lastNotified = new Map<string, number>()
const WINDOW_MS = 60 * 60 * 1000 // 1h

function canNotify(clientId: string): boolean {
  const now = Date.now()
  const last = lastNotified.get(clientId) ?? 0
  if (now - last < WINDOW_MS) return false
  lastNotified.set(clientId, now)
  return true
}

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

  if (!canNotify(user.id)) {
    return NextResponse.json({ success: true, notified: 0, rateLimited: true })
  }

  const admin = createServerClient()

  // Find all active coaches for this client
  const { data: relations, error } = await admin
    .from('coach_client_relations')
    .select('coach_id')
    .eq('client_id', user.id)
    .eq('status', 'active')
    .limit(100)

  if (error) {
    console.error('[coach/notify] fetch failed', error.message)
    return NextResponse.json({ error: 'Coaches konnten nicht geladen werden.' }, { status: 500 })
  }

  const coachIds = (relations ?? []).map((r) => r.coach_id)
  if (coachIds.length === 0) {
    return NextResponse.json({ success: true, notified: 0 })
  }

  // Resolve coach emails via admin API
  let coachEmails: string[] = []
  try {
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
    coachEmails = (list?.users ?? [])
      .filter((u) => coachIds.includes(u.id) && !!u.email)
      .map((u) => u.email as string)
  } catch (err) {
    console.error('[coach/notify] listUsers failed', err)
  }

  if (coachEmails.length === 0) {
    return NextResponse.json({ success: true, notified: 0 })
  }

  const clientName = parsed.data.clientName ?? user.email ?? 'Dein Klient'
  const appUrl = getAppUrl()

  let notified = 0
  try {
    const resend = getResendClient()
    const results = await Promise.all(
      coachEmails.map((to) =>
        resend.emails.send({
          from: getFromEmail(),
          to,
          subject: 'Dein Klient hat die Roadmap aktualisiert',
          html: `
            <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto;">
              <h2>Roadmap-Update</h2>
              <p>Dein Klient <strong>${clientName}</strong> hat die Roadmap aktualisiert.</p>
              <p style="margin: 24px 0;">
                <a href="${appUrl}/coach" style="background:#111827;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Zur Klienten-Ansicht</a>
              </p>
            </div>
          `,
        })
      )
    )
    notified = results.filter((r) => !r.error).length
  } catch (err) {
    console.error('[coach/notify] email failed', err)
  }

  return NextResponse.json({ success: true, notified })
}
