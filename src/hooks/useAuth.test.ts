import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Session, User } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────────
// Mock Supabase client so we can drive the auth state manually
// ─────────────────────────────────────────────────────────────────────────────

type AuthChangeCb = (event: string, session: Session | null) => void

const mockState: {
  initialSession: Session | null
  subscribers: AuthChangeCb[]
  unsubscribeCalls: number
} = {
  initialSession: null,
  subscribers: [],
  unsubscribeCalls: 0,
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockImplementation(() =>
        Promise.resolve({ data: { session: mockState.initialSession } })
      ),
      onAuthStateChange: vi.fn().mockImplementation((cb: AuthChangeCb) => {
        mockState.subscribers.push(cb)
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                mockState.unsubscribeCalls += 1
              },
            },
          },
        }
      }),
    },
  },
}))

// Import AFTER the mock declaration
import { useAuth } from './useAuth'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeUser(email = 'test@example.com'): User {
  return {
    id: 'user-abc-123',
    email,
    aud: 'authenticated',
    app_metadata: {},
    user_metadata: {},
    created_at: '2026-01-01T00:00:00.000Z',
  } as unknown as User
}

function makeSession(user: User = makeUser()): Session {
  return {
    access_token: 'fake-access-token',
    refresh_token: 'fake-refresh-token',
    expires_in: 3600,
    expires_at: Date.now() / 1000 + 3600,
    token_type: 'bearer',
    user,
  } as unknown as Session
}

beforeEach(() => {
  mockState.initialSession = null
  mockState.subscribers = []
  mockState.unsubscribeCalls = 0
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('useAuth', () => {
  it('starts with user=null, session=null, isLoaded=false', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.user).toBeNull()
    expect(result.current.session).toBeNull()
    expect(result.current.isLoaded).toBe(false)
  })

  it('sets isLoaded=true after initial session resolves (no session)', async () => {
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.user).toBeNull()
    expect(result.current.session).toBeNull()
  })

  it('loads an existing session on mount', async () => {
    const user = makeUser('existing@example.com')
    mockState.initialSession = makeSession(user)

    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    expect(result.current.user?.email).toBe('existing@example.com')
    expect(result.current.session).not.toBeNull()
  })

  it('updates state when onAuthStateChange fires SIGNED_IN', async () => {
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    expect(result.current.user).toBeNull()

    const newUser = makeUser('login@example.com')
    const newSession = makeSession(newUser)
    await act(async () => {
      mockState.subscribers.forEach((cb) => cb('SIGNED_IN', newSession))
    })

    expect(result.current.user?.email).toBe('login@example.com')
    expect(result.current.session).not.toBeNull()
  })

  it('clears state when onAuthStateChange fires SIGNED_OUT', async () => {
    mockState.initialSession = makeSession(makeUser('user@example.com'))
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.user).not.toBeNull()

    await act(async () => {
      mockState.subscribers.forEach((cb) => cb('SIGNED_OUT', null))
    })

    expect(result.current.user).toBeNull()
    expect(result.current.session).toBeNull()
  })

  it('updates session when TOKEN_REFRESHED fires', async () => {
    const user = makeUser('refresh@example.com')
    mockState.initialSession = makeSession(user)
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    const refreshedSession = {
      ...makeSession(user),
      access_token: 'new-access-token',
    } as Session

    await act(async () => {
      mockState.subscribers.forEach((cb) => cb('TOKEN_REFRESHED', refreshedSession))
    })

    expect(result.current.session?.access_token).toBe('new-access-token')
    expect(result.current.user?.email).toBe('refresh@example.com')
  })

  it('unsubscribes from auth change listener on unmount', async () => {
    const { unmount, result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    expect(mockState.unsubscribeCalls).toBe(0)
    unmount()
    expect(mockState.unsubscribeCalls).toBe(1)
  })

  it('isLoaded stays true once set, even after auth changes', async () => {
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    await act(async () => {
      mockState.subscribers.forEach((cb) => cb('SIGNED_IN', makeSession()))
    })
    expect(result.current.isLoaded).toBe(true)

    await act(async () => {
      mockState.subscribers.forEach((cb) => cb('SIGNED_OUT', null))
    })
    expect(result.current.isLoaded).toBe(true)
  })
})
