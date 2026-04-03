'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { LifeAreaGoal, LIFE_AREA_COLOR_MAP } from '@/lib/types'

interface Props {
  lifeAreas: LifeAreaGoal[]
  onChange: (areas: LifeAreaGoal[]) => void
  errors: Record<string, string>
}

const GOAL_FIELDS: { key: keyof Pick<LifeAreaGoal, 'yearGoal' | 'quarterGoal' | 'monthGoal' | 'weekGoal'>; label: string; required: boolean; placeholder: string }[] = [
  { key: 'yearGoal',    label: 'Jahresziel',    required: true,  placeholder: 'Was willst du dieses Jahr erreichen?' },
  { key: 'quarterGoal', label: 'Quartalsziel',  required: false, placeholder: 'Was willst du im nächsten Quartal erreichen?' },
  { key: 'monthGoal',   label: 'Monatsziel',    required: false, placeholder: 'Was willst du diesen Monat erreichen?' },
  { key: 'weekGoal',    label: 'Wochenziel',    required: false, placeholder: 'Was willst du diese Woche erreichen?' },
]

export function StepGoalInput({ lifeAreas, onChange, errors }: Props) {
  const updateArea = (id: string, field: string, value: string) => {
    onChange(lifeAreas.map((a) => (a.id === id ? { ...a, [field]: value } : a)))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Deine Ziele
        </h2>
        <p className="text-gray-500">
          Gib für jeden Lebensbereich dein Jahresziel ein. Die anderen Felder sind optional – die KI leitet fehlende Ebenen für dich ab.
        </p>
      </div>

      <Tabs defaultValue={lifeAreas[0]?.id}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-gray-100 p-1">
          {lifeAreas.map((area) => {
            const colors = LIFE_AREA_COLOR_MAP[area.color]
            const hasError = !!errors[`${area.id}_yearGoal`]
            return (
              <TabsTrigger
                key={area.id}
                value={area.id}
                className={`text-xs sm:text-sm data-[state=active]:${colors.bg} data-[state=active]:${colors.text} ${hasError ? 'ring-1 ring-red-400' : ''}`}
              >
                <span className={`w-2 h-2 rounded-full mr-1.5 ${colors.dot}`} />
                {area.name}
                {hasError && <span className="ml-1 text-red-500">*</span>}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {lifeAreas.map((area) => {
          const colors = LIFE_AREA_COLOR_MAP[area.color]
          return (
            <TabsContent key={area.id} value={area.id} className="mt-4 space-y-4">
              <div className={`rounded-xl p-1 ${colors.bg} border ${colors.border}`}>
                <div className="space-y-4 p-4">
                  {GOAL_FIELDS.map(({ key, label, required, placeholder }) => {
                    const errorKey = `${area.id}_${key}`
                    return (
                      <div key={key} className="space-y-1.5">
                        <Label className="text-sm font-medium text-gray-700">
                          {label}
                          {required ? (
                            <span className="text-red-500 ml-0.5">*</span>
                          ) : (
                            <span className="text-gray-400 font-normal ml-1">(optional)</span>
                          )}
                        </Label>
                        <Textarea
                          placeholder={placeholder}
                          value={area[key]}
                          onChange={(e) => updateArea(area.id, key, e.target.value)}
                          className={`min-h-[80px] resize-none bg-white ${errors[errorKey] ? 'border-red-400' : ''}`}
                        />
                        {errors[errorKey] && (
                          <p className="text-xs text-red-500">{errors[errorKey]}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
