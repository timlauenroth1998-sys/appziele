import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useRoadmapStorage } from './useRoadmapStorage'
import { Roadmap } from '@/lib/types'

const STORAGE_KEY = 'ziele_roadmap'

const mockRoadmap: Roadmap = {
  generatedAt: '2026-01-01T00:00:00.000Z',
  profileHash: 'abc123',
  lifeAreaRoadmaps: [
    {
      lifeAreaId: 'career',
      lifeAreaName: 'Karriere & Beruf',
      timeline: {
        vision5y: [{ id: '1', text: 'Führungsposition', isEdited: false }],
        goals3y: [{ id: '2', text: '3-Jahres-Ziel', isEdited: false }],
        goals1y: [{ id: '3', text: 'Jahresziel', isEdited: false }],
        quarters: {
          q1: [{ id: '4', text: 'Q1 Ziel', isEdited: false }],
          q2: [], q3: [], q4: [],
        },
        months: {
          jan: [{ id: '5', text: 'Januar-Ziel', isEdited: false }],
          feb: [], mar: [], apr: [], may: [], jun: [],
          jul: [], aug: [], sep: [], oct: [], nov: [], dec: [],
        },
        weeks: {
          w1: [{ id: '6', text: 'Woche 1 Ziel', isEdited: false }],
          w2: [], w3: [], w4: [],
        },
      },
    },
  ],
}

describe('useRoadmapStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null roadmap and isLoaded=true after mount', async () => {
    const { result } = renderHook(() => useRoadmapStorage())
    await act(async () => {})
    expect(result.current.roadmap).toBeNull()
    expect(result.current.isLoaded).toBe(true)
  })

  it('loads existing roadmap from localStorage on mount', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockRoadmap))
    const { result } = renderHook(() => useRoadmapStorage())
    await act(async () => {})
    expect(result.current.roadmap).not.toBeNull()
    expect(result.current.roadmap?.profileHash).toBe('abc123')
    expect(result.current.roadmap?.lifeAreaRoadmaps).toHaveLength(1)
  })

  it('handles corrupt localStorage JSON without throwing', async () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json{{{')
    const { result } = renderHook(() => useRoadmapStorage())
    await act(async () => {})
    expect(result.current.roadmap).toBeNull()
    expect(result.current.isLoaded).toBe(true)
  })

  it('saveRoadmap persists to localStorage and updates state', async () => {
    const { result } = renderHook(() => useRoadmapStorage())
    await act(async () => {})

    act(() => { result.current.saveRoadmap(mockRoadmap) })

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(stored.profileHash).toBe('abc123')
    expect(result.current.roadmap?.profileHash).toBe('abc123')
  })

  it('saveRoadmap preserves all timeline data', async () => {
    const { result } = renderHook(() => useRoadmapStorage())
    await act(async () => {})

    act(() => { result.current.saveRoadmap(mockRoadmap) })

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(stored.lifeAreaRoadmaps[0].timeline.vision5y[0].text).toBe('Führungsposition')
    expect(stored.lifeAreaRoadmaps[0].timeline.quarters.q1[0].text).toBe('Q1 Ziel')
    expect(stored.lifeAreaRoadmaps[0].timeline.months.jan[0].text).toBe('Januar-Ziel')
    expect(stored.lifeAreaRoadmaps[0].timeline.weeks.w1[0].text).toBe('Woche 1 Ziel')
  })

  it('clearRoadmap removes from localStorage and nullifies state', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockRoadmap))
    const { result } = renderHook(() => useRoadmapStorage())
    await act(async () => {})

    expect(result.current.roadmap).not.toBeNull()

    act(() => { result.current.clearRoadmap() })

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(result.current.roadmap).toBeNull()
  })

  it('overwrites existing roadmap on saveRoadmap', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockRoadmap))
    const { result } = renderHook(() => useRoadmapStorage())
    await act(async () => {})

    const updated = { ...mockRoadmap, profileHash: 'newHash999' }
    act(() => { result.current.saveRoadmap(updated) })

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(stored.profileHash).toBe('newHash999')
  })

  it('roadmap with edited item is preserved correctly', async () => {
    const withEdit: Roadmap = {
      ...mockRoadmap,
      lifeAreaRoadmaps: [{
        ...mockRoadmap.lifeAreaRoadmaps[0],
        timeline: {
          ...mockRoadmap.lifeAreaRoadmaps[0].timeline,
          vision5y: [{ id: '1', text: 'Bearbeitetes Ziel', isEdited: true, editedAt: '2026-01-02T00:00:00.000Z' }],
        },
      }],
    }
    const { result } = renderHook(() => useRoadmapStorage())
    await act(async () => {})

    act(() => { result.current.saveRoadmap(withEdit) })

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(stored.lifeAreaRoadmaps[0].timeline.vision5y[0].isEdited).toBe(true)
    expect(stored.lifeAreaRoadmaps[0].timeline.vision5y[0].editedAt).toBe('2026-01-02T00:00:00.000Z')
  })
})
