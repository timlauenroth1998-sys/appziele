'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { LifeAreaGoal } from '@/lib/types'

const DRAFT_KEY = 'ziele_onboarding_draft'
const DRAFT_VERSION = 1
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 Tage
const SAVE_DELAY_MS = 500

export interface OnboardingDraft {
  version: number
  step: number
  vision5y: string
  lifeAreas: LifeAreaGoal[]
  updatedAt: string
}

/** Was der Wizard an den Entwurfsspeicher übergibt — ohne Metadaten. */
export type DraftInput = Pick<OnboardingDraft, 'step' | 'vision5y' | 'lifeAreas'>

function isLifeArea(value: unknown): value is LifeAreaGoal {
  if (typeof value !== 'object' || value === null) return false
  const a = value as Record<string, unknown>
  return (
    typeof a.id === 'string' &&
    typeof a.name === 'string' &&
    typeof a.color === 'string' &&
    typeof a.yearGoal === 'string' &&
    typeof a.quarterGoal === 'string' &&
    typeof a.monthGoal === 'string' &&
    typeof a.weekGoal === 'string'
  )
}

/**
 * Ein Entwurf aus einer aelteren App-Version oder ein beschaedigter Eintrag darf
 * niemals bis ins Rendering durchschlagen — ein Absturz beim Wiederherstellen
 * waere schlimmer als ein verlorener Entwurf.
 */
function isValidDraft(value: unknown): value is OnboardingDraft {
  if (typeof value !== 'object' || value === null) return false
  const d = value as Record<string, unknown>
  return (
    d.version === DRAFT_VERSION &&
    typeof d.step === 'number' &&
    d.step >= 1 &&
    d.step <= 4 &&
    typeof d.vision5y === 'string' &&
    typeof d.updatedAt === 'string' &&
    !Number.isNaN(Date.parse(d.updatedAt)) &&
    Array.isArray(d.lifeAreas) &&
    d.lifeAreas.every(isLifeArea)
  )
}

function isExpired(draft: OnboardingDraft): boolean {
  return Date.now() - Date.parse(draft.updatedAt) > MAX_AGE_MS
}

export function useOnboardingDraft() {
  const [draft, setDraft] = useState<OnboardingDraft | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [storageAvailable, setStorageAvailable] = useState(true)

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<DraftInput | null>(null)

  const write = useCallback((data: DraftInput): boolean => {
    const entry: OnboardingDraft = {
      version: DRAFT_VERSION,
      ...data,
      updatedAt: new Date().toISOString(),
    }
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(entry))
      return true
    } catch {
      // Safari-Privatmodus oder Kontingent erschoepft — das Onboarding laeuft weiter
      return false
    }
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (isValidDraft(parsed) && !isExpired(parsed)) {
          setDraft(parsed)
        } else {
          localStorage.removeItem(DRAFT_KEY)
        }
      }
    } catch {
      setStorageAvailable(false)
    }
    setIsLoaded(true)
  }, [])

  /** Entkoppelt, damit langes Tippen nicht bei jedem Zeichen schreibt. */
  const saveDraft = useCallback(
    (data: DraftInput) => {
      pending.current = data
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        if (!pending.current) return
        const ok = write(pending.current)
        pending.current = null
        if (!ok) setStorageAvailable(false)
      }, SAVE_DELAY_MS)
    },
    [write]
  )

  const clearDraft = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    pending.current = null
    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch { /* ignore */ }
    setDraft(null)
  }, [])

  // Ausstehenden Schreibvorgang beim Verlassen nachholen, sonst gehen die
  // letzten 500 ms Eingabe verloren — genau der Fall, den das Feature verhindert.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
      if (pending.current) write(pending.current)
    }
  }, [write])

  return { draft, isLoaded, storageAvailable, saveDraft, clearDraft }
}
