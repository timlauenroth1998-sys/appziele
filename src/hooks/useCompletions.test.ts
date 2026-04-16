import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCompletions } from './useCompletions'

// Mock Supabase — tests run in localStorage mode (no session)
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    from: vi.fn(),
  },
}))

// ─────────────────────────────────────────────────────────────────────────────
// localStorage mock
// ─────────────────────────────────────────────────────────────────────────────

const storage: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => storage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { storage[key] = value }),
  removeItem: vi.fn((key: string) => { delete storage[key] }),
  clear: vi.fn(() => { Object.keys(storage).forEach(k => delete storage[k]) }),
}
vi.stubGlobal('localStorage', localStorageMock)

beforeEach(() => {
  localStorageMock.clear()
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('useCompletions', () => {
  it('starts with empty set and isLoaded=true after mount', async () => {
    const { result } = renderHook(() => useCompletions())
    await act(async () => {})
    expect(result.current.isLoaded).toBe(true)
    expect(result.current.completed.size).toBe(0)
  })

  it('loads completions from localStorage on mount', async () => {
    storage['ziele_completions'] = JSON.stringify(['item_1', 'item_2'])
    const { result } = renderHook(() => useCompletions())
    await act(async () => {})
    expect(result.current.completed.has('item_1')).toBe(true)
    expect(result.current.completed.has('item_2')).toBe(true)
  })

  it('handles corrupt localStorage without throwing', async () => {
    storage['ziele_completions'] = 'not valid json{{{'
    const { result } = renderHook(() => useCompletions())
    await act(async () => {})
    expect(result.current.isLoaded).toBe(true)
    expect(result.current.completed.size).toBe(0)
  })

  it('toggle adds an item that was not completed', async () => {
    const { result } = renderHook(() => useCompletions())
    await act(async () => {})
    act(() => { result.current.toggle('item_a') })
    expect(result.current.completed.has('item_a')).toBe(true)
  })

  it('toggle removes an item that was already completed', async () => {
    storage['ziele_completions'] = JSON.stringify(['item_a'])
    const { result } = renderHook(() => useCompletions())
    await act(async () => {})
    act(() => { result.current.toggle('item_a') })
    expect(result.current.completed.has('item_a')).toBe(false)
  })

  it('toggle persists to localStorage', async () => {
    const { result } = renderHook(() => useCompletions())
    await act(async () => {})
    await act(async () => { result.current.toggle('item_x') })
    const stored = JSON.parse(storage['ziele_completions'] ?? '[]') as string[]
    expect(stored).toContain('item_x')
  })

  it('toggle remove persists to localStorage', async () => {
    storage['ziele_completions'] = JSON.stringify(['item_x'])
    const { result } = renderHook(() => useCompletions())
    await act(async () => {})
    await act(async () => { result.current.toggle('item_x') })
    const stored = JSON.parse(storage['ziele_completions'] ?? '[]') as string[]
    expect(stored).not.toContain('item_x')
  })

  it('getProgress returns 0 for empty items array', async () => {
    const { result } = renderHook(() => useCompletions())
    await act(async () => {})
    expect(result.current.getProgress([])).toBe(0)
  })

  it('getProgress returns 100 when all items completed', async () => {
    storage['ziele_completions'] = JSON.stringify(['a', 'b', 'c'])
    const { result } = renderHook(() => useCompletions())
    await act(async () => {})
    const pct = result.current.getProgress([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
    expect(pct).toBe(100)
  })

  it('getProgress returns 50 when half completed', async () => {
    storage['ziele_completions'] = JSON.stringify(['a'])
    const { result } = renderHook(() => useCompletions())
    await act(async () => {})
    const pct = result.current.getProgress([{ id: 'a' }, { id: 'b' }])
    expect(pct).toBe(50)
  })

  it('getProgress rounds to nearest integer', async () => {
    storage['ziele_completions'] = JSON.stringify(['a'])
    const { result } = renderHook(() => useCompletions())
    await act(async () => {})
    // 1 of 3 = 33.33...
    const pct = result.current.getProgress([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
    expect(pct).toBe(33)
  })

  it('isCompleted returns true for completed items', async () => {
    storage['ziele_completions'] = JSON.stringify(['item_z'])
    const { result } = renderHook(() => useCompletions())
    await act(async () => {})
    expect(result.current.isCompleted('item_z')).toBe(true)
    expect(result.current.isCompleted('item_other')).toBe(false)
  })
})
