import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockAuth = { user: null as null | { id: string; email?: string } }

vi.mock('@/lib/auth-server', () => ({
  getUserFromRequest: vi.fn(async () => mockAuth.user),
}))

const emailSend = vi.fn(async () => ({ data: { id: 'em_1' }, error: null }))

vi.mock('@/lib/resend', () => ({
  getResendClient: () => ({ emails: { send: emailSend } }),
  getFromEmail: () => 'from@example.com',
  getAppUrl: () => 'http://localhost:3000',
}))

const dbState = {
  coachesForClient: [] as string[],
  users: [] as { id: string; email: string }[],
}

function mockTable() {
  const ctx = { client_id: null as string | null, status: null as string | null }
  const api = {
    select: () => api,
    eq: (col: keyof typeof ctx, val: string) => {
      ctx[col] = val
      return api
    },
    limit: async () => ({
      data: dbState.coachesForClient.map((coach_id) => ({ coach_id })),
      error: null,
    }),
  }
  return api
}

vi.mock('@/lib/supabase-server', () => ({
  createServerClient: () => ({
    from: () => mockTable(),
    auth: {
      admin: {
        listUsers: async () => ({ data: { users: dbState.users }, error: null }),
      },
    },
  }),
}))

function makeReq(body: unknown, auth = true) {
  return new NextRequest('http://localhost:3000/api/coach/notify', {
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
  dbState.coachesForClient = []
  dbState.users = []
  emailSend.mockClear()
  vi.resetModules()
})

describe('POST /api/coach/notify', () => {
  it('returns 401 when unauthenticated', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeReq({}))
    expect(res.status).toBe(401)
  })

  it('returns success with notified=0 when no coaches', async () => {
    mockAuth.user = { id: 'client1', email: 'c@x.com' }
    const { POST } = await import('./route')
    const res = await POST(makeReq({ clientName: 'Max' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.notified).toBe(0)
    expect(emailSend).not.toHaveBeenCalled()
  })

  it('sends email to every active coach', async () => {
    mockAuth.user = { id: 'client1', email: 'c@x.com' }
    dbState.coachesForClient = ['coach1', 'coach2']
    dbState.users = [
      { id: 'coach1', email: 'a@x.com' },
      { id: 'coach2', email: 'b@x.com' },
    ]
    const { POST } = await import('./route')
    const res = await POST(makeReq({ clientName: 'Max' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.notified).toBe(2)
    expect(emailSend).toHaveBeenCalledTimes(2)
  })

  it('rate-limits a 2nd call within the window', async () => {
    mockAuth.user = { id: 'client1', email: 'c@x.com' }
    dbState.coachesForClient = ['coach1']
    dbState.users = [{ id: 'coach1', email: 'a@x.com' }]
    const { POST } = await import('./route')
    // first call ok
    await POST(makeReq({}))
    emailSend.mockClear()
    // second call rate-limited
    const res = await POST(makeReq({}))
    const body = await res.json()
    expect(body.rateLimited).toBe(true)
    expect(emailSend).not.toHaveBeenCalled()
  })
})
