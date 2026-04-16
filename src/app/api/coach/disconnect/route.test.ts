import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockAuth = { user: null as null | { id: string } }

vi.mock('@/lib/auth-server', () => ({
  getUserFromRequest: vi.fn(async () => mockAuth.user),
}))

interface RelationRow { coach_id: string; client_id: string; status: string }

const dbState = { relations: [] as RelationRow[], lastOr: '' }

function mockTable() {
  const api = {
    delete: () => api,
    or: async (filter: string) => {
      dbState.lastOr = filter
      // Parse the `or(...)` filter produced by the route:
      // and(coach_id.eq.A,client_id.eq.B),and(client_id.eq.A,coach_id.eq.B)
      const m = filter.match(/and\(coach_id\.eq\.([^,]+),client_id\.eq\.([^)]+)\),and\(client_id\.eq\.([^,]+),coach_id\.eq\.([^)]+)\)/)
      if (!m) return { error: null }
      const [, a1, b1, a2, b2] = m
      dbState.relations = dbState.relations.filter(
        (r) => !(
          (r.coach_id === a1 && r.client_id === b1) ||
          (r.client_id === a2 && r.coach_id === b2)
        )
      )
      return { error: null }
    },
  }
  return api
}

vi.mock('@/lib/supabase-server', () => ({
  createServerClient: () => ({ from: () => mockTable() }),
}))

function makeReq(body: unknown, auth = true) {
  return new NextRequest('http://localhost:3000/api/coach/disconnect', {
    method: 'DELETE',
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
  dbState.lastOr = ''
})

describe('DELETE /api/coach/disconnect', () => {
  it('returns 401 when unauthenticated', async () => {
    const { DELETE } = await import('./route')
    const res = await DELETE(makeReq({ partnerId: '550e8400-e29b-41d4-a716-446655440000' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 on invalid partnerId', async () => {
    mockAuth.user = { id: 'u1' }
    const { DELETE } = await import('./route')
    const res = await DELETE(makeReq({ partnerId: 'not-a-uuid' }))
    expect(res.status).toBe(400)
  })

  it('deletes the relation where caller is coach', async () => {
    mockAuth.user = { id: 'coach1' }
    dbState.relations = [
      { coach_id: 'coach1', client_id: '550e8400-e29b-41d4-a716-446655440000', status: 'active' },
    ]
    const { DELETE } = await import('./route')
    const res = await DELETE(makeReq({ partnerId: '550e8400-e29b-41d4-a716-446655440000' }))
    expect(res.status).toBe(200)
    expect(dbState.relations).toHaveLength(0)
  })

  it('deletes the relation where caller is client', async () => {
    mockAuth.user = { id: '550e8400-e29b-41d4-a716-446655440000' }
    dbState.relations = [
      { coach_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7', client_id: '550e8400-e29b-41d4-a716-446655440000', status: 'active' },
    ]
    const { DELETE } = await import('./route')
    const res = await DELETE(makeReq({ partnerId: '7c9e6679-7425-40de-944b-e07fc1f90ae7' }))
    expect(res.status).toBe(200)
    expect(dbState.relations).toHaveLength(0)
  })
})
