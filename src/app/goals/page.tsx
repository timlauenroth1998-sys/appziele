'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useGoalStorage } from '@/hooks/useGoalStorage'
import { useAuth } from '@/hooks/useAuth'
import { useCoachRole } from '@/hooks/useCoachRole'
import { LifeAreaGoal, GoalProfile, LIFE_AREA_COLOR_MAP, CUSTOM_AREA_COLORS, LIFE_AREA_DEFAULTS } from '@/lib/types'
import { UserAuthButton } from '@/components/UserAuthButton'
import { PendingInviteBanner } from '@/components/coach/PendingInviteBanner'

const GOAL_FIELDS: { key: keyof Pick<LifeAreaGoal, 'yearGoal' | 'quarterGoal' | 'monthGoal' | 'weekGoal'>; label: string; required: boolean; placeholder: string }[] = [
  { key: 'yearGoal',    label: 'Jahresziele',   required: true,  placeholder: 'Was willst du dieses Jahr erreichen?\nMehrere Ziele? Jedes in eine neue Zeile.' },
  { key: 'quarterGoal', label: 'Quartalsziele', required: false, placeholder: 'Was willst du im nächsten Quartal erreichen?\nMehrere Ziele? Jedes in eine neue Zeile.' },
  { key: 'monthGoal',   label: 'Monatsziele',   required: false, placeholder: 'Was willst du diesen Monat erreichen?\nMehrere Ziele? Jedes in eine neue Zeile.' },
  { key: 'weekGoal',    label: 'Wochenziele',   required: false, placeholder: 'Was willst du diese Woche erreichen?\nMehrere Ziele? Jedes in eine neue Zeile.' },
]

export default function GoalsPage() {
  const router = useRouter()
  const { profile, saveProfile, isLoaded } = useGoalStorage()
  const { user } = useAuth()
  const { isCoach } = useCoachRole()

  const [customInput, setCustomInput] = useState('')
  const [showAddArea, setShowAddArea] = useState(false)

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-white max-w-3xl mx-auto px-6 pt-16 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white">
        <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-3xl mx-auto">
          <span className="font-semibold text-gray-900">Ziele App</span>
          <div className="flex items-center gap-2">
            {isCoach && (
              <Button variant="ghost" size="sm" onClick={() => router.push('/coach')}>
                Klienten
              </Button>
            )}
            {user && (
              <>
                <Button variant="ghost" size="sm" onClick={() => router.push('/documents')}>
                  Dokumente
                </Button>
                <Button variant="ghost" size="sm" onClick={() => router.push('/settings')}>
                  Einstellungen
                </Button>
              </>
            )}
            <UserAuthButton />
          </div>
        </nav>
        {user && <PendingInviteBanner />}
        <div className="flex items-center justify-center text-center px-6 mt-32">
          <div>
            <p className="text-gray-500 mb-4">Noch keine Ziele eingegeben.</p>
            <Button onClick={() => router.push('/onboarding')}>Jetzt starten →</Button>
          </div>
        </div>
      </div>
    )
  }

  const updateArea = (id: string, field: string, value: string) => {
    const updated: GoalProfile = {
      ...profile,
      lifeAreas: profile.lifeAreas.map((a) => (a.id === id ? { ...a, [field]: value } : a)),
    }
    saveProfile(updated)
  }

  const updateVision = (value: string) => {
    saveProfile({ ...profile, vision5y: value })
  }

  const removeArea = (id: string) => {
    if (profile.lifeAreas.length <= 1) return
    saveProfile({ ...profile, lifeAreas: profile.lifeAreas.filter((a) => a.id !== id) })
  }

  const addCustomArea = () => {
    const name = customInput.trim()
    if (!name || profile.lifeAreas.length >= 8) return
    const usedColors = profile.lifeAreas.map((a) => a.color)
    const color = CUSTOM_AREA_COLORS.find((c) => !usedColors.includes(c)) ?? 'purple'
    const newArea: LifeAreaGoal = {
      id: `custom_${Date.now()}`,
      name,
      isCustom: true,
      color,
      yearGoal: '',
      quarterGoal: '',
      monthGoal: '',
      weekGoal: '',
    }
    saveProfile({ ...profile, lifeAreas: [...profile.lifeAreas, newArea] })
    setCustomInput('')
    setShowAddArea(false)
  }

  const addDefaultArea = (id: string) => {
    if (profile.lifeAreas.find((a) => a.id === id)) return
    const def = LIFE_AREA_DEFAULTS.find((d) => d.id === id)!
    saveProfile({
      ...profile,
      lifeAreas: [...profile.lifeAreas, { ...def, yearGoal: '', quarterGoal: '', monthGoal: '', weekGoal: '' }],
    })
  }

  const missingDefaults = LIFE_AREA_DEFAULTS.filter(
    (d) => !profile.lifeAreas.find((a) => a.id === d.id)
  )

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-3xl mx-auto">
        <span className="font-semibold text-gray-900">Ziele App</span>
        <div className="flex items-center gap-2">
          {isCoach && (
            <Button variant="ghost" size="sm" onClick={() => router.push('/coach')}>
              Klienten
            </Button>
          )}
          {user && (
            <Button variant="ghost" size="sm" onClick={() => router.push('/settings')}>
              Einstellungen
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/onboarding')}
          >
            Neu starten
          </Button>
          <Button size="sm" onClick={() => router.push('/roadmap')}>
            Roadmap generieren →
          </Button>
          <UserAuthButton />
        </div>
      </nav>

      {user && <PendingInviteBanner />}

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Meine Ziele</h1>
          <p className="text-gray-500 text-sm">Alle Änderungen werden automatisch gespeichert.</p>
        </div>

        {/* 5-year vision */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            5-Jahres-Vision
            <span className="text-gray-400 font-normal ml-1">(optional)</span>
          </Label>
          <Textarea
            value={profile.vision5y}
            onChange={(e) => updateVision(e.target.value)}
            placeholder="In 5 Jahren möchte ich..."
            className="resize-none min-h-[80px]"
          />
        </div>

        {/* Life area goals */}
        <Tabs defaultValue={profile.lifeAreas[0]?.id}>
          <div className="flex items-center justify-between mb-3">
            <TabsList className="flex flex-wrap h-auto gap-1 bg-gray-100 p-1 flex-1 mr-3">
              {profile.lifeAreas.map((area) => {
                const colors = LIFE_AREA_COLOR_MAP[area.color]
                return (
                  <TabsTrigger
                    key={area.id}
                    value={area.id}
                    className={`text-xs sm:text-sm data-[state=active]:${colors.bg} data-[state=active]:${colors.text}`}
                  >
                    <span className={`w-2 h-2 rounded-full mr-1.5 ${colors.dot}`} />
                    {area.name}
                  </TabsTrigger>
                )
              })}
            </TabsList>
            {profile.lifeAreas.length < 8 && (
              <Button variant="outline" size="sm" onClick={() => setShowAddArea(!showAddArea)}>
                + Bereich
              </Button>
            )}
          </div>

          {/* Add area panel */}
          {showAddArea && (
            <div className="mb-4 p-4 border border-gray-200 rounded-xl bg-gray-50 space-y-3">
              <p className="text-sm font-medium text-gray-700">Lebensbereich hinzufügen</p>
              {missingDefaults.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {missingDefaults.map((d) => {
                    const colors = LIFE_AREA_COLOR_MAP[d.color]
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => { addDefaultArea(d.id); setShowAddArea(false) }}
                        className={`text-xs px-3 py-1.5 rounded-full border ${colors.border} ${colors.bg} ${colors.text} hover:opacity-80`}
                      >
                        + {d.name}
                      </button>
                    )
                  })}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Eigener Bereich..."
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomArea()}
                  className="flex-1 text-sm"
                />
                <Button size="sm" onClick={addCustomArea} disabled={!customInput.trim()}>
                  Hinzufügen
                </Button>
              </div>
            </div>
          )}

          {profile.lifeAreas.map((area) => {
            const colors = LIFE_AREA_COLOR_MAP[area.color]
            return (
              <TabsContent key={area.id} value={area.id}>
                <Card className={`border ${colors.border}`}>
                  <CardHeader className={`${colors.bg} py-3 px-4`}>
                    <CardTitle className={`text-sm font-semibold flex items-center justify-between ${colors.text}`}>
                      <span className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                        {area.name}
                        {area.isCustom && (
                          <Badge variant="outline" className={`text-xs border-current ml-1`}>Eigener Bereich</Badge>
                        )}
                      </span>
                      {area.isCustom && profile.lifeAreas.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeArea(area.id)}
                          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                        >
                          Entfernen
                        </button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    {GOAL_FIELDS.map(({ key, label, required, placeholder }) => (
                      <div key={key} className="space-y-1.5">
                        <Label className="text-sm font-medium text-gray-700">
                          {label}
                          {required
                            ? <span className="text-red-500 ml-0.5">*</span>
                            : <span className="text-gray-400 font-normal ml-1">(optional)</span>
                          }
                        </Label>
                        <Textarea
                          value={area[key]}
                          onChange={(e) => updateArea(area.id, key, e.target.value)}
                          placeholder={placeholder}
                          className="min-h-[100px]"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            )
          })}
        </Tabs>

      </main>
    </div>
  )
}
