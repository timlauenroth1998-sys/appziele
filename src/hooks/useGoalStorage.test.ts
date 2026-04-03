import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useGoalStorage } from './useGoalStorage'
import { GoalProfile } from '@/lib/types'

const STORAGE_KEY = 'ziele_goal_profile'

const mockProfile: GoalProfile = {
  vision5y: 'In 5 Jahren bin ich selbstständig',
  lifeAreas: [
    {
      id: 'career',
      name: 'Karriere & Beruf',
      isCustom: false,
      color: 'blue',
      yearGoal: 'Beförderung erreichen',
      quarterGoal: 'Projekt X abschließen',
      monthGoal: 'Präsentation vorbereiten',
      weekGoal: 'Meeting vorbereiten',
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('useGoalStorage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('returns null profile when localStorage is empty after mount', async () => {
    const { result } = renderHook(() => useGoalStorage())
    await act(async () => {})
    expect(result.current.profile).toBeNull()
    expect(result.current.isLoaded).toBe(true)
  })

  it('loads existing profile from localStorage on mount', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockProfile))
    const { result } = renderHook(() => useGoalStorage())
    await act(async () => {})
    expect(result.current.profile).toMatchObject({ vision5y: 'In 5 Jahren bin ich selbstständig' })
    expect(result.current.profile?.lifeAreas).toHaveLength(1)
  })

  it('returns null if localStorage is empty', async () => {
    const { result } = renderHook(() => useGoalStorage())
    await act(async () => {})
    expect(result.current.profile).toBeNull()
  })

  it('handles corrupt localStorage JSON without throwing', async () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json{{{{')
    const { result } = renderHook(() => useGoalStorage())
    await act(async () => {})
    expect(result.current.profile).toBeNull()
    expect(result.current.isLoaded).toBe(true)
  })

  it('saveProfile persists to localStorage and updates state', async () => {
    const { result } = renderHook(() => useGoalStorage())
    await act(async () => {})

    act(() => {
      result.current.saveProfile(mockProfile)
    })

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(stored.vision5y).toBe('In 5 Jahren bin ich selbstständig')
    expect(result.current.profile?.vision5y).toBe('In 5 Jahren bin ich selbstständig')
  })

  it('saveProfile updates the updatedAt timestamp', async () => {
    const before = new Date().toISOString()
    const { result } = renderHook(() => useGoalStorage())
    await act(async () => {})

    act(() => {
      result.current.saveProfile(mockProfile)
    })

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(stored.updatedAt >= before).toBe(true)
  })

  it('clearProfile removes from localStorage and nullifies state', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockProfile))
    const { result } = renderHook(() => useGoalStorage())
    await act(async () => {})

    expect(result.current.profile).not.toBeNull()

    act(() => {
      result.current.clearProfile()
    })

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(result.current.profile).toBeNull()
  })

  it('saveProfile then clearProfile leaves no trace in localStorage', async () => {
    const { result } = renderHook(() => useGoalStorage())
    await act(async () => {})

    act(() => result.current.saveProfile(mockProfile))
    act(() => result.current.clearProfile())

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('overwrites existing localStorage data on saveProfile', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockProfile))
    const { result } = renderHook(() => useGoalStorage())
    await act(async () => {})

    const updated = { ...mockProfile, vision5y: 'Neue Vision' }
    act(() => result.current.saveProfile(updated))

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(stored.vision5y).toBe('Neue Vision')
  })
})
