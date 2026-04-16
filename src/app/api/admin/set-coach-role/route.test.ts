import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockAuth = { user: null as null | { id: string; user_metadata?: Record<string, unknown> } }

vi.mock('@/lib/auth-server', () => ({
  getUserFromRequest: vi.fn(async () => mockAuth.user),
}))

interface FakeUser { id: string; email?: string; user_metadata: Record<string, unknown> }

const dbState = {
  users: {} as Record<string, FakeUser>,
}

const getUserById = vi.fn(async (id: string) => {
  const u = dbState.users[id]
  if (!u) return { data: { user: null }, error: { message: 'not found' } }
  return { data: { user: u }, error: null }
})

const updateUserById = vi.fn(async (id: string, patch: { user_metadata?: Record<string, unknown> }) => {
  const u = dbState.users[id]
  if (!u) return { data: null, error: { message: 'not found' } }
  if (patch.user_metadata) u.user_metadata = patch.user_metadata
  return { data: { user: u }, error: null }
})

vi.mock('@/lib/supabase-server', () => ({
  createServerClient: () => ({
    auth: { admin: { getUserById, updateUserById } },
  }),
}))

function makeReq(body: unknown, auth = true) {
  return new NextRequest('http://localhost:3000/api/admin/set-coach-role', {
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
  dbState.users = {}
  getUserById.mockClear()
  updateUserById.mockClear()
})

describe('POST /api/admin/set-coach-role', () => {
  it('returns 401 when unauthenticated', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeReq({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      isCoach: true,
    }))
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is not admin', async () => {
    mockAuth.user = { id: 'u1', user_metadata: { role: 'user' } }
    const { POST } = await import('./route')
    const res = await POST(makeReq({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      isCoach: true,
    }))
    expect(res.status).toBe(403)
  })

  it('returns 400 on invalid body', async () => {
    mockAuth.user = { id: 'admin1', user_metadata: { role: 'admin' } }
    const { POST } = await import('./route')
    const res = await POST(makeReq({ userId: 'not-a-uuid', isCoach: true }))
    expect(res.status).toBe(400)
  })

  it('returns 404 when target user missing', async () => {
    mockAuth.user = { id: 'admin1', user_metadata: { role: 'admin' } }
    const { POST } = await import('./route')
    const res = await POST(makeReq({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      isCoach: true,
    }))
    expect(res.status).toBe(404)
  })

  it('refuses to downgrade an admin', async () => {
    mockAuth.user = { id: 'admin1', user_metadata: { role: 'admin' } }
    dbState.users['7c9e6679-7425-40de-944b-e07fc1f90ae7'] = {
      id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      user_metadata: { role: 'admin' },
    }
    const { POST } = await import('./route')
    const res = await POST(makeReq({
      userId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      isCoach: false,
    }))
    expect(res.status).toBe(400)
  })

  it('promotes user to coach', async () => {
    mockAuth.user = { id: 'admin1', user_metadata: { role: 'admin' } }
    dbState.users['7c9e6679-7425-40de-944b-e07fc1f90ae7'] = {
      id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      user_metadata: { role: 'user' },
    }
    const { POST } = await import('./route')
    const res = await POST(makeReq({
      userId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      isCoach: true,
    }))
    expect(res.status).toBe(200)
    expect(dbState.users['7c9e6679-7425-40de-944b-e07fc1f90ae7'].user_metadata.role).toBe('coach')
  })

  it('demotes coach back to user', async () => {
    mockAuth.user = { id: 'admin1', user_metadata: { role: 'admin' } }
    dbState.users['7c9e6679-7425-40de-944b-e07fc1f90ae7'] = {
      id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      user_metadata: { role: 'coach' },
    }
    const { POST } = await import('./route')
    const res = await POST(makeReq({
      userId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      isCoach: false,
    }))
    expect(res.status).toBe(200)
    expect(dbState.users['7c9e6679-7425-40de-944b-e07fc1f90ae7'].user_metadata.role).toBe('user')
  })
})
