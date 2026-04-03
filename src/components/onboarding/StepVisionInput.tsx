'use client'

import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface Props {
  value: string
  onChange: (value: string) => void
}

export function StepVisionInput({ value, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Deine große Vision
        </h2>
        <p className="text-gray-500">
          Wo möchtest du in 5 Jahren stehen? Beschreibe dein ideales Leben – so konkret oder offen wie du möchtest.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="vision5y" className="text-sm font-medium text-gray-700">
          5-Jahres-Vision <span className="text-gray-400 font-normal">(optional)</span>
        </Label>
        <Textarea
          id="vision5y"
          placeholder="In 5 Jahren möchte ich..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[140px] resize-none text-base"
        />
        <p className="text-xs text-gray-400">
          Tipp: Schreibe im Präsens und in der Ich-Form. Je konkreter, desto besser.
        </p>
      </div>
    </div>
  )
}
