import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useOnboardingDraft } from './useOnboardingDraft'
import { LifeAreaGoal } from '@/lib/types'

const DRAFT_KEY = 'ziele_onboarding_draft'

const area: LifeAreaGoal = {
  id: 'career',
  name: 'Karriere & Beruf',
  isCustom: false,
  color: 'blue',
  yearGoal: 'Drei Retainer-Kunden gewinnen',
  quarterGoal: '',
  monthGoal: '',
  weekGoal: '',
}

function writeDraft(partial: Record<string, unknown>) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(partial))
}

function validDraft(updatedAt = new Date().toISOString()) {
  return { version: 1, step: 3, vision5y: 'Meine Vision', lifeAreas: [area], updatedAt }
}

describe('useOnboardingDraft', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('liefert keinen Entwurf, wenn nichts gespeichert ist', async () => {
    const { result } = renderHook(() => useOnboardingDraft())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.draft).toBeNull()
    expect(result.current.storageAvailable).toBe(true)
  })

  it('stellt einen gueltigen Entwurf wieder her', async () => {
    writeDraft(validDraft())
    const { result } = renderHook(() => useOnboardingDraft())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    expect(result.current.draft?.step).toBe(3)
    expect(result.current.draft?.vision5y).toBe('Meine Vision')
    expect(result.current.draft?.lifeAreas).toHaveLength(1)
  })

  it('schreibt verzoegert und nicht bei jedem Aufruf sofort', async () => {
    const { result } = renderHook(() => useOnboardingDraft())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    act(() => {
      result.current.saveDraft({ step: 2, vision5y: 'A', lifeAreas: [area] })
    })
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull()

    act(() => {
      vi.advanceTimersByTime(600)
    })
    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY) as string)
    expect(stored.vision5y).toBe('A')
    expect(stored.step).toBe(2)
    expect(stored.version).toBe(1)
  })

  it('verwirft einen Entwurf, der aelter als 30 Tage ist', async () => {
    const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString()
    writeDraft(validDraft(old))

    const { result } = renderHook(() => useOnboardingDraft())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    expect(result.current.draft).toBeNull()
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull()
  })

  it('verwirft einen Entwurf mit falscher Formatnummer', async () => {
    writeDraft({ ...validDraft(), version: 99 })
    const { result } = renderHook(() => useOnboardingDraft())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.draft).toBeNull()
  })

  it('verwirft einen Entwurf mit unvollstaendigem Lebensbereich', async () => {
    writeDraft({ ...validDraft(), lifeAreas: [{ id: 'career', name: 'Karriere' }] })
    const { result } = renderHook(() => useOnboardingDraft())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.draft).toBeNull()
  })

  it('stuerzt bei beschaedigtem JSON nicht ab', async () => {
    localStorage.setItem(DRAFT_KEY, '{ das ist kein json')
    const { result } = renderHook(() => useOnboardingDraft())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.draft).toBeNull()
  })

  it('loescht den Entwurf ueber clearDraft', async () => {
    writeDraft(validDraft())
    const { result } = renderHook(() => useOnboardingDraft())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    act(() => {
      result.current.clearDraft()
    })
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull()
    expect(result.current.draft).toBeNull()
  })

  it('meldet fehlenden Speicher, ohne zu werfen', async () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    const { result } = renderHook(() => useOnboardingDraft())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    act(() => {
      result.current.saveDraft({ step: 1, vision5y: 'X', lifeAreas: [area] })
    })
    act(() => {
      vi.advanceTimersByTime(600)
    })

    await waitFor(() => expect(result.current.storageAvailable).toBe(false))
    spy.mockRestore()
  })
})
