'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { RoadmapItem } from '@/lib/types'

interface Props {
  item: RoadmapItem
  onSave: (updated: RoadmapItem) => void
}

interface ParsedEntry {
  goal: string
  firstStep: string | null
  question: string | null
}

function parseEntry(text: string): ParsedEntry {
  const stepMatch = text.match(/→\s*Erster Schritt:\s*([\s\S]*?)(?=→\s*Reflexionsfrage:|$)/)
  const questionMatch = text.match(/→\s*Reflexionsfrage:\s*([\s\S]*?)$/)

  const goal = text
    .replace(/→\s*Erster Schritt:[\s\S]*$/, '')
    .trim()
    .replace(/\.$/, '')

  return {
    goal: goal || text,
    firstStep: stepMatch ? stepMatch[1].trim().replace(/\.$/, '') : null,
    question: questionMatch ? questionMatch[1].trim().replace(/\?$/, '') : null,
  }
}

export function RoadmapItemCard({ item, onSave }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.text)

  const handleSave = () => {
    if (!draft.trim()) return
    onSave({ ...item, text: draft.trim(), isEdited: true, editedAt: new Date().toISOString() })
    setEditing(false)
  }

  const handleCancel = () => {
    setDraft(item.text)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="space-y-2 p-3 border border-gray-200 rounded-lg bg-white">
        <Textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          className="min-h-[120px] text-sm"
          autoFocus
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={!draft.trim()}>Speichern</Button>
          <Button size="sm" variant="ghost" onClick={handleCancel}>Abbrechen</Button>
        </div>
      </div>
    )
  }

  const parsed = parseEntry(item.text)

  return (
    <div className="group relative rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Edit button */}
      <button
        type="button"
        onClick={() => { setDraft(item.text); setEditing(true) }}
        className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded px-1.5 py-0.5"
        aria-label="Bearbeiten"
      >
        ✎
      </button>
      {item.isEdited && (
        <div className="absolute top-2.5 right-10">
          <Badge variant="outline" className="text-xs text-amber-600 border-amber-200 bg-amber-50">
            Bearbeitet
          </Badge>
        </div>
      )}

      {/* Main goal */}
      <div className="px-4 pt-4 pb-3">
        <p className="text-sm font-medium text-gray-900 leading-relaxed pr-8">{parsed.goal}</p>
      </div>

      {/* First step */}
      {parsed.firstStep && (
        <div className="mx-4 mb-2 flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          <span className="text-blue-500 mt-0.5 flex-shrink-0 font-bold text-xs">▶</span>
          <div>
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Erster Schritt</span>
            <p className="text-xs text-blue-800 mt-0.5 leading-relaxed">{parsed.firstStep}</p>
          </div>
        </div>
      )}

      {/* Reflection question */}
      {parsed.question && (
        <div className="mx-4 mb-4 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          <span className="text-amber-500 mt-0.5 flex-shrink-0 font-bold text-xs">?</span>
          <div>
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Reflexionsfrage</span>
            <p className="text-xs text-amber-800 mt-0.5 leading-relaxed italic">{parsed.question}?</p>
          </div>
        </div>
      )}
    </div>
  )
}
