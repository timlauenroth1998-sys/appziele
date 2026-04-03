'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { LifeAreaGoal, LIFE_AREA_DEFAULTS, CUSTOM_AREA_COLORS, LIFE_AREA_COLOR_MAP } from '@/lib/types'

interface Props {
  selected: LifeAreaGoal[]
  onChange: (areas: LifeAreaGoal[]) => void
}

function emptyGoals() {
  return { yearGoal: '', quarterGoal: '', monthGoal: '', weekGoal: '' }
}

export function StepLifeAreaSelector({ selected, onChange }: Props) {
  const [customInput, setCustomInput] = useState('')

  const selectedIds = new Set(selected.map((a) => a.id))

  const toggleDefault = (id: string) => {
    if (selectedIds.has(id)) {
      if (selected.length === 1) return // keep at least one
      onChange(selected.filter((a) => a.id !== id))
    } else {
      const def = LIFE_AREA_DEFAULTS.find((d) => d.id === id)!
      onChange([...selected, { ...def, ...emptyGoals() }])
    }
  }

  const addCustom = () => {
    const name = customInput.trim()
    if (!name || selected.length >= 8) return
    const usedColors = selected.map((a) => a.color)
    const color = CUSTOM_AREA_COLORS.find((c) => !usedColors.includes(c)) ?? 'purple'
    const id = `custom_${Date.now()}`
    onChange([...selected, { id, name, isCustom: true, color, ...emptyGoals() }])
    setCustomInput('')
  }

  const removeCustom = (id: string) => {
    if (selected.length === 1) return
    onChange(selected.filter((a) => a.id !== id))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Deine Lebensbereiche
        </h2>
        <p className="text-gray-500">
          Wähle die Bereiche, für die du Ziele definieren möchtest. Du kannst auch eigene hinzufügen.
        </p>
      </div>

      {/* Predefined areas */}
      <div className="grid grid-cols-2 gap-3">
        {LIFE_AREA_DEFAULTS.map((area) => {
          const isActive = selectedIds.has(area.id)
          const colors = LIFE_AREA_COLOR_MAP[area.color]
          return (
            <button
              key={area.id}
              type="button"
              onClick={() => toggleDefault(area.id)}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                isActive
                  ? `${colors.bg} ${colors.border} ${colors.text}`
                  : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isActive ? colors.dot : 'bg-gray-300'}`} />
              <span className="text-sm font-medium">{area.name}</span>
            </button>
          )
        })}
      </div>

      {/* Custom areas */}
      {selected.filter((a) => a.isCustom).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected
            .filter((a) => a.isCustom)
            .map((area) => {
              const colors = LIFE_AREA_COLOR_MAP[area.color]
              return (
                <Badge
                  key={area.id}
                  variant="outline"
                  className={`${colors.bg} ${colors.border} ${colors.text} px-3 py-1.5 text-sm gap-2`}
                >
                  {area.name}
                  <button
                    type="button"
                    onClick={() => removeCustom(area.id)}
                    className="ml-1 hover:opacity-60 leading-none"
                    aria-label={`${area.name} entfernen`}
                  >
                    ×
                  </button>
                </Badge>
              )
            })}
        </div>
      )}

      {/* Add custom */}
      {selected.length < 8 ? (
        <div className="flex gap-2">
          <Input
            placeholder="Eigener Bereich (z.B. Spiritualität)"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustom()}
            className="flex-1"
          />
          <Button type="button" variant="outline" onClick={addCustom} disabled={!customInput.trim()}>
            Hinzufügen
          </Button>
        </div>
      ) : (
        <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
          Maximum von 8 Lebensbereichen erreicht.
        </p>
      )}

      <p className="text-xs text-gray-400">
        {selected.length} von max. 8 Bereichen ausgewählt
      </p>
    </div>
  )
}
