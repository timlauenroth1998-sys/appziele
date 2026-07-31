'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useGoalStorage } from '@/hooks/useGoalStorage'
import { useOnboardingDraft } from '@/hooks/useOnboardingDraft'
import { StepVisionInput } from '@/components/onboarding/StepVisionInput'
import { StepLifeAreaSelector } from '@/components/onboarding/StepLifeAreaSelector'
import { StepGoalInput } from '@/components/onboarding/StepGoalInput'
import { StepGoalSummary } from '@/components/onboarding/StepGoalSummary'
import { DraftRestoredNotice } from '@/components/onboarding/DraftRestoredNotice'
import { ExistingProfileWarning } from '@/components/onboarding/ExistingProfileWarning'
import { LifeAreaGoal, GoalProfile, LIFE_AREA_DEFAULTS } from '@/lib/types'

const STEPS = [
  { id: 1, title: 'Deine Vision' },
  { id: 2, title: 'Lebensbereiche' },
  { id: 3, title: 'Ziele eingeben' },
  { id: 4, title: 'Zusammenfassung' },
]

function defaultLifeAreas(): LifeAreaGoal[] {
  return LIFE_AREA_DEFAULTS.slice(0, 2).map((d) => ({
    ...d,
    yearGoal: '',
    quarterGoal: '',
    monthGoal: '',
    weekGoal: '',
  }))
}

export default function OnboardingPage() {
  const router = useRouter()
  const { saveProfile, profile, isLoaded: profileLoaded } = useGoalStorage()
  const {
    draft,
    isLoaded: draftLoaded,
    storageAvailable,
    saveDraft,
    clearDraft,
  } = useOnboardingDraft()

  const [step, setStep] = useState(1)
  const [vision5y, setVision5y] = useState('')
  const [lifeAreas, setLifeAreas] = useState<LifeAreaGoal[]>(defaultLifeAreas)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [hydrated, setHydrated] = useState(false)
  const [restored, setRestored] = useState(false)
  const [profileWarningDismissed, setProfileWarningDismissed] = useState(false)

  // Ausgangszustand nach der Uebernahme. Solange sich nichts davon unterscheidet,
  // hat der Nutzer nichts eingegeben — dann darf auch kein Entwurf entstehen.
  const baseline = useRef<string | null>(null)
  const dirty = useRef(false)

  const snapshot = (s: number, v: string, a: LifeAreaGoal[]) =>
    JSON.stringify({ step: s, vision5y: v, lifeAreas: a })

  // Entwurf einmalig uebernehmen, bevor gespeichert wird — sonst ueberschriebe
  // der leere Anfangszustand den gesicherten Stand.
  useEffect(() => {
    if (!draftLoaded || hydrated) return
    if (draft) {
      setVision5y(draft.vision5y)
      setLifeAreas(draft.lifeAreas)
      setStep(draft.step)
      setRestored(true)
      baseline.current = snapshot(draft.step, draft.vision5y, draft.lifeAreas)
    } else {
      baseline.current = snapshot(step, vision5y, lifeAreas)
    }
    setHydrated(true)
    // step/vision5y/lifeAreas sind hier bewusst die Anfangswerte und keine Abhaengigkeit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftLoaded, draft, hydrated])

  useEffect(() => {
    if (!hydrated) return
    // Erst schreiben, wenn sich tatsaechlich etwas geaendert hat. Sonst entstuende
    // schon beim blossen Seitenaufruf ein leerer Entwurf, und der Hinweis
    // "Stand gesichert" erschiene jedem Wiederkehrer ohne jede Eingabe.
    if (!dirty.current) {
      if (snapshot(step, vision5y, lifeAreas) === baseline.current) return
      dirty.current = true
    }
    saveDraft({ step, vision5y, lifeAreas })
  }, [hydrated, step, vision5y, lifeAreas, saveDraft])

  const startOver = () => {
    clearDraft()
    const freshAreas = defaultLifeAreas()
    setVision5y('')
    setLifeAreas(freshAreas)
    setStep(1)
    setErrors({})
    setSaveError('')
    setRestored(false)
    // Nach dem Verwerfen wieder als unberuehrt behandeln, sonst legt der Effekt
    // sofort einen neuen leeren Entwurf an.
    baseline.current = snapshot(1, '', freshAreas)
    dirty.current = false
  }

  const validate = (): boolean => {
    if (step === 2) {
      if (lifeAreas.length === 0) {
        setErrors({ lifeAreas: 'Bitte wähle mindestens einen Lebensbereich.' })
        return false
      }
    }
    if (step === 3) {
      const newErrors: Record<string, string> = {}
      lifeAreas.forEach((area) => {
        if (!area.yearGoal.trim()) {
          newErrors[`${area.id}_yearGoal`] = 'Jahresziel ist erforderlich.'
        }
      })
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        return false
      }
    }
    setErrors({})
    return true
  }

  const next = () => {
    if (!validate()) return
    setStep((s) => Math.min(s + 1, 4))
  }

  const back = () => {
    setErrors({})
    setStep((s) => Math.max(s - 1, 1))
  }

  const finish = async () => {
    if (saving) return
    setSaving(true)
    setSaveError('')

    const newProfile: GoalProfile = {
      vision5y,
      lifeAreas,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    try {
      await saveProfile(newProfile)
      // Erst nach nachgewiesenem Speichern verwerfen — schlaegt es fehl, bleibt
      // der Entwurf liegen und der Nutzer findet beim naechsten Mal alles vor.
      clearDraft()
      router.push('/goals')
    } catch {
      // Never navigate away on a failed save — the user would lose everything.
      setSaveError('Deine Ziele konnten nicht gespeichert werden. Bitte versuche es noch einmal.')
      setSaving(false)
    }
  }

  // Erst zeichnen, wenn Entwurf und Profil geladen sind — sonst blitzt kurz der
  // leere Schritt 1 auf, bevor der gesicherte Stand einspringt.
  if (!draftLoaded || !profileLoaded) return null

  // Bewusst unabhaengig davon, ob ein Entwurf wiederhergestellt wurde: Gerade der
  // unterbrochene und spaeter fortgesetzte Durchlauf ist der Fall, in dem sonst
  // bestehende Ziele ohne jede Warnung ersetzt wuerden.
  const showProfileWarning = !!profile && !profileWarningDismissed

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-2xl mx-auto w-full">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="text-gray-400 hover:text-gray-600 text-sm"
        >
          ← Ziele App
        </button>
        <span className="text-sm text-gray-400">
          Schritt {step} von {STEPS.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100 max-w-2xl mx-auto w-full">
        <div
          className="h-full bg-gray-900 transition-all duration-300"
          style={{ width: `${(step / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Notices */}
      {(showProfileWarning || restored || !storageAvailable) && (
        <div className="max-w-2xl mx-auto w-full px-6 pt-6">
          {showProfileWarning && (
            <ExistingProfileWarning onDismiss={() => setProfileWarningDismissed(true)} />
          )}
          {restored && draft && (
            <DraftRestoredNotice updatedAt={draft.updatedAt} onDiscard={startOver} />
          )}
          {!storageAvailable && (
            <p className="text-xs text-gray-400 mb-6">
              Hinweis: Dein Fortschritt kann in diesem Browser nicht gesichert werden.
              Das Onboarding funktioniert trotzdem – schließe das Fenster nur nicht
              zwischendurch.
            </p>
          )}
        </div>
      )}

      {/* Step indicator */}
      <div className="max-w-2xl mx-auto w-full px-6 pt-8 pb-2">
        <div className="flex gap-2 mb-8">
          {STEPS.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-colors ${
                  s.id === step
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : s.id < step
                    ? 'border-gray-900 bg-white text-gray-900'
                    : 'border-gray-200 bg-white text-gray-400'
                }`}
              >
                {s.id < step ? '✓' : s.id}
              </div>
              {s.id < STEPS.length && (
                <div className={`h-px w-6 sm:w-12 ${s.id < step ? 'bg-gray-900' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 pb-8">
        {step === 1 && <StepVisionInput value={vision5y} onChange={setVision5y} />}
        {step === 2 && <StepLifeAreaSelector selected={lifeAreas} onChange={setLifeAreas} />}
        {step === 3 && <StepGoalInput lifeAreas={lifeAreas} onChange={setLifeAreas} errors={errors} />}
        {step === 4 && (
          <StepGoalSummary profile={{ vision5y, lifeAreas, createdAt: '', updatedAt: '' }} />
        )}

        {errors.lifeAreas && (
          <p className="text-sm text-red-500 mt-3">{errors.lifeAreas}</p>
        )}
        {saveError && (
          <p className="text-sm text-red-500 mt-3" role="alert">{saveError}</p>
        )}
      </main>

      {/* Navigation */}
      <div className="border-t border-gray-100 px-6 py-4 max-w-2xl mx-auto w-full flex justify-between items-center">
        <Button variant="ghost" onClick={back} disabled={step === 1}>
          ← Zurück
        </Button>
        {step < 4 ? (
          <Button onClick={next}>
            {step === 1 && vision5y === '' ? 'Überspringen' : 'Weiter'} →
          </Button>
        ) : (
          <Button onClick={finish} disabled={saving} className="px-6">
            {saving ? 'Wird gespeichert …' : 'Ziele speichern & weiter →'}
          </Button>
        )}
      </div>
    </div>
  )
}
