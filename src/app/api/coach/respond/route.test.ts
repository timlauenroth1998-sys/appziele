import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockAuth = { user: null as null | { id: string; email?: string } }

vi.mock('@/lib/auth-server', () => ({
  getUserFromRequest: vi.fn(async () => mockAuth.user),
}))

interface RelationRow {
  coach_id: string
  client_id: string
  status: 'pending' | 'active' | 'declined'
}

const dbState = { relations: [] as RelationRow[] }

function mockTable() {
  const ctx = { coach_id: null as string | null, client_id: null as string | null }
  const updates: Partial<RelationRow> = {}
  const api: {
    select: () => typeof api
    eq: (col: keyof typeof ctx, val: string) => typeof api
    maybeSingle: () => Promise<{ data: RelationRow | null; error: null }>
    update: (patch: Partial<RelationRow>) => typeof api
    _run: () => Promise<{ error: null }>
  } = {
    select: () => api,
    eq: (col, val) => {
      ctx[col] = val
      return api
    },
    maybeSingle: async () => {
      const found = dbState.relations.find((r) =>
        (ctx.coach_id == null || r.coach_id === ctx.coach_id) &&
        (ctx.client_id == null || r.client_id === ctx.client_id)
      )
      return { data: found ?? null, error: null }
    },
    update: (patch) => {
      Object.assign(updates, patch)
      return api
    },
    _run: async () => {
      dbState.relations = dbState.relations.map((r) =>
        (ctx.coach_id == null || r.coach_id === ctx.coach_id) &&
        (ctx.client_id == null || r.client_id === ctx.client_id)
          ? { ...r, ...updates }
          : r
      )
      return { error: null }
    },
  }

  // Hack: make the update chain awaitable by making eq return a thenable
  // when called *after* an update(). Easier approach: return a promise-like
  // from the last `.eq(...)` after an update. We detect this by patching eq.
  const eqOrig = api.eq
  api.eq = (col, val) => {
    ctx[col] = val
    // If we're in an update chain, return a thenable wrapped api
    if (Object.keys(updates).length > 0) {
      return Object.assign(api, {
        then: (res: (x: { error: null }) => void) => api._run().then(res),
      })
    }
    return eqOrig(col, val)
  }
  return api
}

vi.mock('@/lib/supabase-server', () => ({
  createServerClient: () => ({
    from: () => mockTable(),
  }),
}))

function makeReq(body: unknown, auth = true) {
  return new NextRequest('http://localhost:3000/api/coach/respond', {
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
})

describe('POST /api/coach/respond', () => {
  it('returns 401 when unauthenticated', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeReq({ coachId: '550e8400-e29b-41d4-a716-446655440000', action: 'accept' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 on invalid coachId', async () => {
    mockAuth.user = { id: 'client1', email: 'c@x.com' }
    const { POST } = await import('./route')
    const res = await POST(makeReq({ coachId: 'not-a-uuid', action: 'accept' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 on invalid action', async () => {
    mockAuth.user = { id: 'client1', email: 'c@x.com' }
    const { POST } = await import('./route')
    const res = await POST(makeReq({
      coachId: '550e8400-e29b-41d4-a716-446655440000',
      action: 'maybe',
    }))
    expect(res.status).toBe(400)
  })

  it('returns 404 when no pending invite', async () => {
    mockAuth.user = { id: 'client1', email: 'c@x.com' }
    const { POST } = await import('./route')
    const res = await POST(makeReq({
      coachId: '550e8400-e29b-41d4-a716-446655440000',
      action: 'accept',
    }))
    expect(res.status).toBe(404)
  })

  it('accepts a pending invite (status → active)', async () => {
    mockAuth.user = { id: 'client1', email: 'c@x.com' }
    dbState.relations = [
      { coach_id: '550e8400-e29b-41d4-a716-446655440000', client_id: 'client1', status: 'pending' },
    ]
    const { POST } = await import('./route')
    const res = await POST(makeReq({
      coachId: '550e8400-e29b-41d4-a716-446655440000',
      action: 'accept',
    }))
    expect(res.status).toBe(200)
    expect(dbState.relations[0].status).toBe('active')
  })

  it('declines a pending invite (status → declined)', async () => {
    mockAuth.user = { id: 'client1', email: 'c@x.com' }
    dbState.relations = [
      { coach_id: '550e8400-e29b-41d4-a716-446655440000', client_id: 'client1', status: 'pending' },
    ]
    const { POST } = await import('./route')
    const res = await POST(makeReq({
      coachId: '550e8400-e29b-41d4-a716-446655440000',
      action: 'decline',
    }))
    expect(res.status).toBe(200)
    expect(dbState.relations[0].status).toBe('declined')
  })
})
