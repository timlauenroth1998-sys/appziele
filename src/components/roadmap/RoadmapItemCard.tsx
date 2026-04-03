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
      <div className="space-y-2">
        <Textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          className="min-h-[72px] resize-none text-sm"
          autoFocus
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={!draft.trim()}>Speichern</Button>
          <Button size="sm" variant="ghost" onClick={handleCancel}>Abbrechen</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 group">
      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 leading-relaxed">{item.text}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {item.isEdited && (
          <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
            Bearbeitet
          </Badge>
        )}
        <button
          type="button"
          onClick={() => { setDraft(item.text); setEditing(true) }}
          className="text-xs text-gray-400 hover:text-gray-700 px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors"
          aria-label="Bearbeiten"
        >
          ✎
        </button>
      </div>
    </div>
  )
}
