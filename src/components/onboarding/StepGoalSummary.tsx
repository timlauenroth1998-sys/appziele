'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GoalProfile, LIFE_AREA_COLOR_MAP } from '@/lib/types'

interface Props {
  profile: GoalProfile
}

const FIELD_LABELS = [
  { key: 'yearGoal',    label: 'Jahresziel' },
  { key: 'quarterGoal', label: 'Quartalsziel' },
  { key: 'monthGoal',   label: 'Monatsziel' },
  { key: 'weekGoal',    label: 'Wochenziel' },
] as const

export function StepGoalSummary({ profile }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Zusammenfassung
        </h2>
        <p className="text-gray-500">
          Überprüfe deine Ziele. Danach kannst du deine persönliche Roadmap generieren.
        </p>
      </div>

      {profile.vision5y && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">5-Jahres-Vision</p>
          <p className="text-gray-800 text-sm leading-relaxed">{profile.vision5y}</p>
        </div>
      )}

      <div className="space-y-4">
        {profile.lifeAreas.map((area) => {
          const colors = LIFE_AREA_COLOR_MAP[area.color]
          const filledFields = FIELD_LABELS.filter(({ key }) => area[key])
          return (
            <Card key={area.id} className={`border ${colors.border} overflow-hidden`}>
              <CardHeader className={`py-3 px-4 ${colors.bg}`}>
                <CardTitle className={`text-sm font-semibold flex items-center gap-2 ${colors.text}`}>
                  <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                  {area.name}
                  {area.yearGoal.length < 10 && area.yearGoal.length > 0 && (
                    <Badge variant="outline" className="ml-auto text-xs text-amber-600 border-amber-300 bg-amber-50">
                      Kurzes Ziel
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {filledFields.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Keine Ziele eingegeben</p>
                ) : (
                  filledFields.map(({ key, label }) => (
                    <div key={key} className="flex gap-3">
                      <span className="text-xs text-gray-400 w-24 flex-shrink-0 pt-0.5">{label}</span>
                      <span className="text-sm text-gray-700">{area[key]}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
