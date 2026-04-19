import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockAuth = { user: null as null | { id: string; user_metadata?: Record<string, unknown> } }

vi.mock('@/lib/auth-server', () => ({
  getUserFromRequest: vi.fn(async () => mockAuth.user),
  getAppRole: vi.fn((user: { user_metadata?: Record<string, unknown> }) => {
    const meta = user?.user_metadata
    return (meta?.app_role ?? meta?.role) as string | undefined
  }),
}))

const dbDocs: Array<{ id: string; name: string; size_bytes: number; chunk_count: number; created_at: string }> = []

vi.mock('@/lib/supabase-server', () => ({
  createServerClient: () => ({
    from: (table: string) => {
      if (table !== 'documents') throw new Error('unexpected table')
      const api = {
        select: () => api,
        order: () => api,
        limit: () => api,
        eq: (_col: string, id: string) => ({
          ...api,
          _id: id,
          delete: () => ({
            eq: (_c: string, _id: string) => ({ error: null }),
            error: null,
          }),
        }),
        delete: () => ({ eq: (_col: string, id: string) => {
          const idx = dbDocs.findIndex(d => d.id === id)
          if (idx >= 0) dbDocs.splice(idx, 1)
          return { error: null }
        }}),
        data: dbDocs,
        error: null,
        then: (resolve: (v: { data: typeof dbDocs; error: null }) => void) =>
          resolve({ data: dbDocs, error: null }),
      }
      return {
        select: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: dbDocs, error: null }),
          }),
        }),
        delete: () => ({
          eq: (_col: string, id: string) => {
            const idx = dbDocs.findIndex(d => d.id === id)
            if (idx >= 0) dbDocs.splice(idx, 1)
            return Promise.resolve({ error: null })
          },
        }),
      }
    },
  }),
}))

function makeReq(method: string, body?: unknown) {
  return new NextRequest('http://localhost/api/library/documents', {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

beforeEach(() => {
  mockAuth.user = null
  dbDocs.length = 0
})

describe('GET /api/library/documents', () => {
  it('returns 401 when unauthenticated', async () => {
    const { GET } = await import('./route')
    const res = await GET(makeReq('GET'))
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin', async () => {
    mockAuth.user = { id: 'u1', user_metadata: { app_role: 'coach' } }
    const { GET } = await import('./route')
    const res = await GET(makeReq('GET'))
    expect(res.status).toBe(403)
  })

  it('returns 200 with document list for admin', async () => {
    mockAuth.user = { id: 'admin1', user_metadata: { app_role: 'admin' } }
    dbDocs.push({ id: 'doc1', name: 'Test', size_bytes: 1024, chunk_count: 5, created_at: new Date().toISOString() })
    const { GET } = await import('./route')
    const res = await GET(makeReq('GET'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })
})

describe('DELETE /api/library/documents', () => {
  it('returns 401 when unauthenticated', async () => {
    const { DELETE } = await import('./route')
    const res = await DELETE(makeReq('DELETE', { id: '550e8400-e29b-41d4-a716-446655440000' }))
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin', async () => {
    mockAuth.user = { id: 'u1', user_metadata: { app_role: 'coach' } }
    const { DELETE } = await import('./route')
    const res = await DELETE(makeReq('DELETE', { id: '550e8400-e29b-41d4-a716-446655440000' }))
    expect(res.status).toBe(403)
  })

  it('returns 400 for invalid UUID', async () => {
    mockAuth.user = { id: 'admin1', user_metadata: { app_role: 'admin' } }
    const { DELETE } = await import('./route')
    const res = await DELETE(makeReq('DELETE', { id: 'not-a-uuid' }))
    expect(res.status).toBe(400)
  })

  it('deletes document for admin', async () => {
    mockAuth.user = { id: 'admin1', user_metadata: { app_role: 'admin' } }
    const { DELETE } = await import('./route')
    const res = await DELETE(makeReq('DELETE', { id: '550e8400-e29b-41d4-a716-446655440000' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})
