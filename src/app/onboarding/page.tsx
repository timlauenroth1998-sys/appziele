'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useGoalStorage } from '@/hooks/useGoalStorage'
import { StepVisionInput } from '@/components/onboarding/StepVisionInput'
import { StepLifeAreaSelector } from '@/components/onboarding/StepLifeAreaSelector'
import { StepGoalInput } from '@/components/onboarding/StepGoalInput'
import { StepGoalSummary } from '@/components/onboarding/StepGoalSummary'
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
  const { saveProfile } = useGoalStorage()

  const [step, setStep] = useState(1)
  const [vision5y, setVision5y] = useState('')
  const [lifeAreas, setLifeAreas] = useState<LifeAreaGoal[]>(defaultLifeAreas)
  const [errors, setErrors] = useState<Record<string, string>>({})

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

  const finish = () => {
    const profile: GoalProfile = {
      vision5y,
      lifeAreas,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveProfile(profile)
    router.push('/goals')
  }

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
          <Button onClick={finish} className="px-6">
            Ziele speichern & weiter →
          </Button>
        )}
      </div>
    </div>
  )
}
