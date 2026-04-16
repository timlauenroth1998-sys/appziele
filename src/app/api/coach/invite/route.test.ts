import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

const mockAuth = { user: null as null | { id: string; email?: string; user_metadata?: Record<string, unknown> } }

vi.mock('@/lib/auth-server', () => ({
  getUserFromRequest: vi.fn(async () => mockAuth.user),
}))

const emailSend = vi.fn(async () => ({ data: { id: 'em_1' }, error: null }))

vi.mock('@/lib/resend', () => ({
  getResendClient: () => ({ emails: { send: emailSend } }),
  getFromEmail: () => 'from@example.com',
  getAppUrl: () => 'http://localhost:3000',
}))

interface RelationRow {
  coach_id: string
  client_id: string
  status: 'pending' | 'active' | 'declined'
  invited_email: string | null
}

const dbState = {
  relations: [] as RelationRow[],
  users: [] as { id: string; email: string }[],
}

function mockTable() {
  const ctx = {
    coach_id: null as string | null,
    client_id: null as string | null,
    invited_email: null as string | null,
    status: null as string | null,
  }

  const api: {
    select: (..._a: unknown[]) => typeof api
    eq: (col: keyof typeof ctx, val: string) => typeof api
    maybeSingle: () => Promise<{ data: RelationRow | null; error: null }>
    upsert: (row: RelationRow) => Promise<{ error: null }>
  } = {
    select: () => api,
    eq: (col, val) => {
      ctx[col] = val
      return api
    },
    maybeSingle: async () => {
      const found = dbState.relations.find((r) =>
        (ctx.coach_id == null || r.coach_id === ctx.coach_id) &&
        (ctx.client_id == null || r.client_id === ctx.client_id) &&
        (ctx.invited_email == null || r.invited_email === ctx.invited_email) &&
        (ctx.status == null || r.status === ctx.status)
      )
      return { data: found ?? null, error: null }
    },
    upsert: async (row) => {
      const idx = dbState.relations.findIndex(
        (r) => r.coach_id === row.coach_id && r.client_id === row.client_id
      )
      if (idx >= 0) dbState.relations[idx] = row
      else dbState.relations.push(row)
      return { error: null }
    },
  }
  return api
}

vi.mock('@/lib/supabase-server', () => ({
  createServerClient: () => ({
    from: () => mockTable(),
    auth: {
      admin: {
        listUsers: async () => ({
          data: { users: dbState.users.map((u) => ({ id: u.id, email: u.email })) },
          error: null,
        }),
      },
    },
  }),
}))

function makeReq(body: unknown, auth = true) {
  return new NextRequest('http://localhost:3000/api/coach/invite', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: 'Bearer token' } : {}),
    },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  mockAuth.user = null
  dbState.relations = []
  dbState.users = []
  emailSend.mockClear()
})

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/coach/invite', () => {
  it('returns 401 when unauthenticated', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeReq({ email: 'foo@example.com' }))
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is not a coach', async () => {
    mockAuth.user = { id: 'u1', email: 'me@example.com', user_metadata: { role: 'user' } }
    const { POST } = await import('./route')
    const res = await POST(makeReq({ email: 'client@example.com' }))
    expect(res.status).toBe(403)
  })

  it('returns 400 for invalid email', async () => {
    mockAuth.user = { id: 'u1', email: 'me@example.com', user_metadata: { role: 'coach' } }
    const { POST } = await import('./route')
    const res = await POST(makeReq({ email: 'not-an-email' }))
    expect(res.status).toBe(400)
  })

  it('refuses self-invite', async () => {
    mockAuth.user = { id: 'u1', email: 'me@example.com', user_metadata: { role: 'coach' } }
    const { POST } = await import('./route')
    const res = await POST(makeReq({ email: 'me@example.com' }))
    expect(res.status).toBe(400)
  })

  it('returns 409 when invite already pending', async () => {
    mockAuth.user = { id: 'coach1', email: 'coach@example.com', user_metadata: { role: 'coach' } }
    dbState.users = [{ id: 'client1', email: 'client@example.com' }]
    dbState.relations = [
      { coach_id: 'coach1', client_id: 'client1', status: 'pending', invited_email: 'client@example.com' },
    ]
    const { POST } = await import('./route')
    const res = await POST(makeReq({ email: 'client@example.com' }))
    expect(res.status).toBe(409)
  })

  it('creates pending relation and sends email on happy path', async () => {
    mockAuth.user = { id: 'coach1', email: 'coach@example.com', user_metadata: { role: 'coach' } }
    dbState.users = [{ id: 'client1', email: 'client@example.com' }]
    const { POST } = await import('./route')
    const res = await POST(makeReq({ email: 'client@example.com' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(dbState.relations).toHaveLength(1)
    expect(dbState.relations[0].status).toBe('pending')
    expect(emailSend).toHaveBeenCalledTimes(1)
  })
})
