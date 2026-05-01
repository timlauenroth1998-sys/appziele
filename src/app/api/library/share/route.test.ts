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

type ShareRow = { document_id: string; coach_id: string; client_id: string }
const dbRelations: Array<{ coach_id: string; client_id: string; status: string }> = []
const dbShares: ShareRow[] = []

vi.mock('@/lib/supabase-server', () => ({
  createServerClient: () => ({
    from: (table: string) => {
      if (table === 'coach_client_relations') {
        return {
          select: () => ({
            eq: (col1: string, val1: string) => ({
              eq: (col2: string, val2: string) => ({
                eq: (col3: string, val3: string) => ({
                  maybeSingle: async () => {
                    const found = dbRelations.find(r =>
                      r[col1 as keyof typeof r] === val1 &&
                      r[col2 as keyof typeof r] === val2 &&
                      r[col3 as keyof typeof r] === val3
                    )
                    return { data: found ?? null, error: null }
                  },
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'document_shares') {
        return {
          select: (_cols: string) => ({
            eq: (col1: string, val1: string) => ({
              eq: (col2: string, val2: string) => {
                const rows = dbShares.filter(s =>
                  s[col1 as keyof ShareRow] === val1 &&
                  s[col2 as keyof ShareRow] === val2
                )
                return Promise.resolve({ data: rows, error: null })
              },
            }),
          }),
          upsert: async (row: ShareRow) => {
            const idx = dbShares.findIndex(s =>
              s.document_id === row.document_id &&
              s.coach_id === row.coach_id &&
              s.client_id === row.client_id
            )
            if (idx < 0) dbShares.push(row)
            return { error: null }
          },
          delete: () => ({
            eq: (col1: string, val1: string) => ({
              eq: (col2: string, val2: string) => ({
                eq: (col3: string, val3: string) => {
                  const before = dbShares.length
                  const idx = dbShares.findIndex(s =>
                    s[col1 as keyof ShareRow] === val1 &&
                    s[col2 as keyof ShareRow] === val2 &&
                    s[col3 as keyof ShareRow] === val3
                  )
                  if (idx >= 0) dbShares.splice(idx, 1)
                  return Promise.resolve({ error: null, count: before - dbShares.length })
                },
              }),
            }),
          }),
        }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))

function makeReq(method: string, body: unknown) {
  return new NextRequest('http://localhost/api/library/share', {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
    body: JSON.stringify(body),
  })
}

function makeGetReq(clientId: string) {
  return new NextRequest(`http://localhost/api/library/share?clientId=${clientId}`, {
    method: 'GET',
    headers: { Authorization: 'Bearer token' },
  })
}

const VALID_DOC_ID = '550e8400-e29b-41d4-a716-446655440001'
const VALID_CLIENT_ID = '550e8400-e29b-41d4-a716-446655440002'

beforeEach(() => {
  mockAuth.user = null
  dbRelations.length = 0
  dbShares.length = 0
})

describe('GET /api/library/share', () => {
  it('returns 401 when unauthenticated', async () => {
    const { GET } = await import('./route')
    const res = await GET(makeGetReq(VALID_CLIENT_ID))
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-coach', async () => {
    mockAuth.user = { id: 'u1', user_metadata: { app_role: 'user' } }
    const { GET } = await import('./route')
    const res = await GET(makeGetReq(VALID_CLIENT_ID))
    expect(res.status).toBe(403)
  })

  it('returns shares for coach', async () => {
    mockAuth.user = { id: 'coach1', user_metadata: { app_role: 'coach' } }
    dbShares.push({ document_id: VALID_DOC_ID, coach_id: 'coach1', client_id: VALID_CLIENT_ID })
    const { GET } = await import('./route')
    const res = await GET(makeGetReq(VALID_CLIENT_ID))
    expect(res.status).toBe(200)
    const body = await res.json() as Array<{ documentId: string }>
    expect(body).toHaveLength(1)
    expect(body[0].documentId).toBe(VALID_DOC_ID)
  })
})

describe('POST /api/library/share', () => {
  it('returns 401 when unauthenticated', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeReq('POST', { documentId: VALID_DOC_ID, clientId: VALID_CLIENT_ID }))
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-coach', async () => {
    mockAuth.user = { id: 'u1', user_metadata: { app_role: 'user' } }
    const { POST } = await import('./route')
    const res = await POST(makeReq('POST', { documentId: VALID_DOC_ID, clientId: VALID_CLIENT_ID }))
    expect(res.status).toBe(403)
  })

  it('returns 400 for invalid UUIDs', async () => {
    mockAuth.user = { id: 'coach1', user_metadata: { app_role: 'coach' } }
    const { POST } = await import('./route')
    const res = await POST(makeReq('POST', { documentId: 'bad', clientId: VALID_CLIENT_ID }))
    expect(res.status).toBe(400)
  })

  it('returns 403 if client is not connected', async () => {
    mockAuth.user = { id: 'coach1', user_metadata: { app_role: 'coach' } }
    const { POST } = await import('./route')
    const res = await POST(makeReq('POST', { documentId: VALID_DOC_ID, clientId: VALID_CLIENT_ID }))
    expect(res.status).toBe(403)
  })

  it('shares document with connected client', async () => {
    mockAuth.user = { id: 'coach1', user_metadata: { app_role: 'coach' } }
    dbRelations.push({ coach_id: 'coach1', client_id: VALID_CLIENT_ID, status: 'active' })
    const { POST } = await import('./route')
    const res = await POST(makeReq('POST', { documentId: VALID_DOC_ID, clientId: VALID_CLIENT_ID }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})

describe('DELETE /api/library/share', () => {
  it('returns 401 when unauthenticated', async () => {
    const { DELETE } = await import('./route')
    const res = await DELETE(makeReq('DELETE', { documentId: VALID_DOC_ID, clientId: VALID_CLIENT_ID }))
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-coach', async () => {
    mockAuth.user = { id: 'u1', user_metadata: { app_role: 'user' } }
    const { DELETE } = await import('./route')
    const res = await DELETE(makeReq('DELETE', { documentId: VALID_DOC_ID, clientId: VALID_CLIENT_ID }))
    expect(res.status).toBe(403)
  })

  it('unshares document for coach', async () => {
    mockAuth.user = { id: 'coach1', user_metadata: { app_role: 'coach' } }
    dbShares.push({ document_id: VALID_DOC_ID, coach_id: 'coach1', client_id: VALID_CLIENT_ID })
    const { DELETE } = await import('./route')
    const res = await DELETE(makeReq('DELETE', { documentId: VALID_DOC_ID, clientId: VALID_CLIENT_ID }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})
